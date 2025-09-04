"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Check, Merge, GripVertical, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDragDrop } from "@/hooks/use-drag-drop"

interface Task {
  _id: string
  uuid: string
  title: string
  description?: string
  priority: "high" | "medium" | "low"
  category: string
  eisenhowerCategory?: "urgent-important" | "urgent-not-important" | "not-urgent-important" | "not-urgent-not-important"
  completed: boolean
  duration: number // in hours
  scheduledDate?: Date
}

interface TimeSlot {
  _id: string
  day: Date
  startTime: Date
  endTime: Date
  task?: Task
  merged: boolean
}

interface ScheduleProps {
  schedule: any
}

const priorityColors = {
  high: "bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
  medium:
    "bg-yellow-100 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200",
  low: "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200",
}

const eisenhowerColors = {
  "urgent-important": "bg-red-200 dark:bg-red-900/40 border-red-400 dark:border-red-600",
  "urgent-not-important": "bg-orange-200 dark:bg-orange-900/40 border-orange-400 dark:border-orange-600",
  "not-urgent-important": "bg-blue-200 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600",
  "not-urgent-not-important": "bg-gray-200 dark:bg-gray-900/40 border-gray-400 dark:border-gray-600",
}

// Helper function to get days to include in schedule (from today until Sunday)
function getDaysToSchedule(): string[] {
  const today = new Date()
  const currentDay = today.getDay() // 0 = Sunday, 6 = Saturday
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // If today is Sunday, include only Sunday
  if (currentDay === 0) {
    return ['Sunday']
  }

  // Otherwise, include from today until Sunday
  const daysToInclude = []
  for (let i = currentDay; i <= 6; i++) {
    daysToInclude.push(allDays[i])
  }

  return daysToInclude
}

export function WeeklySchedule({ schedule }: ScheduleProps) {
  const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const days = getDaysToSchedule() // Only include relevant days
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [existingSchedule, setExistingSchedule] = useState<any>(null)
  const [showWarning, setShowWarning] = useState(false)

  console.log("[WeeklySchedule] Component render - schedule:", schedule, "timeSlots.length:", timeSlots.length)

  const { draggedItem, dragOverTarget, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave } = useDragDrop()

  // Check for existing schedule for current week
  const checkExistingSchedule = async () => {
    try {
      const response = await fetch('/api/schedules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      })
      if (response.ok) {
        const schedules = await response.json()
        const currentWeekStart = new Date()
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1) // Monday
        currentWeekStart.setHours(0, 0, 0, 0)

        const existingSchedule = schedules.find((schedule: any) => {
          const scheduleWeekStart = new Date(schedule.weekStartDate)
          scheduleWeekStart.setHours(0, 0, 0, 0)
          return scheduleWeekStart.getTime() === currentWeekStart.getTime()
        })

        if (existingSchedule) {
          setExistingSchedule(existingSchedule)
          setShowWarning(true)
          return existingSchedule
        }
      }
    } catch (error) {
      console.error('Error checking existing schedule:', error)
    }
    return null
  }

  // Clean up existing schedule data
  const cleanupExistingSchedule = async (existingSchedule: any) => {
    try {
      // Delete existing time slots
      if (existingSchedule.timeSlots && existingSchedule.timeSlots.length > 0) {
        for (const timeSlotId of existingSchedule.timeSlots) {
          await fetch(`/api/time-slots/${timeSlotId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            }
          })
        }
      }

      // Delete existing schedule
      await fetch(`/api/schedules/${existingSchedule._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      })

      console.log('Existing schedule cleaned up successfully')
    } catch (error) {
      console.error('Error cleaning up existing schedule:', error)
    }
  }

  // Handle user confirmation to proceed with new schedule
  const handleProceedWithNewSchedule = async () => {
    if (existingSchedule) {
      await cleanupExistingSchedule(existingSchedule)
    }
    setShowWarning(false)
    setExistingSchedule(null)
    // Process the new schedule
    await processNewSchedule()
  }

  // Process new schedule after cleanup
  const processNewSchedule = async () => {
    if (!schedule) return

    try {
      const slots: TimeSlot[] = []

      for (const day of days) {
        // Create time slots for custom time range: 4am to 2am next day (22 hours)
        // Hours: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2
        const hours = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2]

        for (const hour of hours) {
          const slotId = `${day}-${hour}`

          // Check if we already have this slot
          const existingSlot = timeSlots.find((slot) => {
            const slotDay = new Date(slot.day).toLocaleDateString('en-US', { weekday: 'long' })
            const slotHour = new Date(slot.startTime).getHours()
            const slotDate = new Date(slot.startTime).toDateString()
            const currentDate = new Date(slot.day).toDateString()

            // For hours 0, 1, 2, check if the slot is on the next day
            if (hour === 0 || hour === 1 || hour === 2) {
              const nextDay = new Date(slot.day)
              nextDay.setDate(nextDay.getDate() + 1)
              return slotDay === day && slotHour === hour && slotDate === nextDay.toDateString()
            }

            // For other hours, check if the slot is on the same day
            return slotDay === day && slotHour === hour && slotDate === currentDate
          })

          if (existingSlot) {
            console.log(`[WeeklySchedule] Using existing slot for ${day} ${hour}:00 with task:`, existingSlot.task ? existingSlot.task.title : 'no task')
            slots.push(existingSlot)
          } else {
            let task: Task | undefined

            // Parse schedule data if available
            if (schedule[day]) {
              const daySchedule = schedule[day]
              const timeFormats = [
                hour.toString(),
                `${hour}:00`,
                `${hour}am`,
                `${hour}pm`,
                `${hour}:00am`,
                `${hour}:00pm`
              ]

              let taskData = null
              for (const format of timeFormats) {
                if (daySchedule[format]) {
                  taskData = daySchedule[format]
                  break
                }
              }

              if (taskData) {
                // Create task via API
                // Calculate the scheduled date for this task
                // Get the current date and find the actual calendar date for each day of the week
                const today = new Date()
                const currentDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                // Map day names to day numbers (Monday = 1, Tuesday = 2, etc.)
                const dayNameToNumber = {
                  'Monday': 1,
                  'Tuesday': 2,
                  'Wednesday': 3,
                  'Thursday': 4,
                  'Friday': 5,
                  'Saturday': 6,
                  'Sunday': 0
                }

                const targetDayNumber = dayNameToNumber[day as keyof typeof dayNameToNumber]

                // Calculate how many days to add to get to the target day
                let daysToAdd = targetDayNumber - currentDayOfWeek
                if (daysToAdd <= 0) {
                  daysToAdd += 7 // If the day has passed this week, go to next week
                }

                const dayDate = new Date(today)
                dayDate.setDate(today.getDate() + daysToAdd)
                dayDate.setHours(hour, 0, 0, 0)

                const response = await fetch('/api/tasks', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
                  },
                  body: JSON.stringify({
                    title: taskData.title || taskData.task || "Generated Task",
                    description: taskData.description || "",
                    priority: taskData.priority || "medium",
                    category: taskData.category || "General",
                    eisenhowerCategory: taskData.eisenhowerCategory || "not-urgent-not-important",
                    duration: taskData.duration || 1,
                    scheduledDate: dayDate.toISOString(),
                  }),
                })

                if (response.ok) {
                  task = await response.json()
                }
              }
            }

            // Always create time slot (for all 24 hours), with or without task
            // Calculate the scheduled date for this time slot using the same logic
            const today = new Date()
            const currentDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            // Map day names to day numbers (Monday = 1, Tuesday = 2, etc.)
            const dayNameToNumber = {
              'Monday': 1,
              'Tuesday': 2,
              'Wednesday': 3,
              'Thursday': 4,
              'Friday': 5,
              'Saturday': 6,
              'Sunday': 0
            }

            const targetDayNumber = dayNameToNumber[day as keyof typeof dayNameToNumber]

            // Calculate how many days to add to get to the target day
            let daysToAdd = targetDayNumber - currentDayOfWeek
            if (daysToAdd <= 0) {
              daysToAdd += 7 // If the day has passed this week, go to next week
            }

            const dayDate = new Date(today)
            dayDate.setDate(today.getDate() + daysToAdd)

            // Handle hours 0, 1, 2 which are on the next day
            let actualHour = hour
            let actualDayDate = new Date(dayDate)

            if (hour === 0 || hour === 1 || hour === 2) {
              // These hours are on the next day
              actualDayDate.setDate(dayDate.getDate() + 1)
            }

            const startTime = new Date(actualDayDate)
            startTime.setHours(actualHour, 0, 0, 0)

            const endTime = new Date(actualDayDate)
            endTime.setHours(actualHour + 1, 0, 0, 0)

            const slotResponse = await fetch('/api/time-slots', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
              },
              body: JSON.stringify({
                day: dayDate.toISOString(),
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                taskId: task?._id || null // null if no task
              }),
            })

            if (slotResponse.ok) {
              const newSlot = await slotResponse.json()
              console.log(`[WeeklySchedule] Created new slot for ${day} ${hour}:00 with task:`, newSlot.task ? newSlot.task.title : 'no task')
              slots.push(newSlot)
            }
          }
        }
      }

      setTimeSlots(slots)
    } catch (error) {
      console.error('Error processing new schedule:', error)
    }
  }

  // Handle user cancellation
  const handleCancelNewSchedule = () => {
    setShowWarning(false)
    setExistingSchedule(null)
  }

  // Fetch time slots from MongoDB
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        const response = await fetch('/api/time-slots', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setTimeSlots(data)
        }
      } catch (error) {
        console.error('Error fetching time slots:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTimeSlots()
  }, [])

  // Process schedule data when it changes
  useEffect(() => {
    if (!schedule || loading) return

    const processSchedule = async () => {
      try {
        // Check for existing schedule first
        const existing = await checkExistingSchedule()

        if (existing) {
          // Show warning and don't process new schedule
          return
        }

        // If no existing schedule, process normally
        await processNewSchedule()
      } catch (error) {
        console.error('Error processing schedule:', error)
      }
    }

    processSchedule()
  }, [schedule, loading])

  const toggleTaskCompletion = async (slotId: string) => {
    console.log("[WeeklySchedule] toggleTaskCompletion called for slotId:", slotId)
    const slot = timeSlots.find(s => s._id === slotId)
    if (!slot || !slot.task) return

    const newCompleted = !slot.task.completed

    try {
      const response = await fetch(`/api/tasks/${slot.task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          completed: newCompleted
        }),
      })

      if (response.ok) {
        setTimeSlots((slots) => {
          return slots.map((s) => {
            if (s._id === slotId && s.task) {
              return { ...s, task: { ...s.task, completed: newCompleted } }
            }
            return s
          })
        })
      }
    } catch (error) {
      console.error('Error updating task completion:', error)
    }
  }

  const mergeWithNext = async (slotId: string) => {
    console.log("[WeeklySchedule] mergeWithNext called for slotId:", slotId)
    const slotIndex = timeSlots.findIndex((slot) => slot._id === slotId)
    const nextSlotIndex = slotIndex + 1

    console.log("[WeeklySchedule] Slot indices - current:", slotIndex, "next:", nextSlotIndex, "total slots:", timeSlots.length)

    if (nextSlotIndex < timeSlots.length) {
      const currentSlot = timeSlots[slotIndex]
      const nextSlot = timeSlots[nextSlotIndex]

      console.log("[WeeklySchedule] Current slot:", currentSlot, "Next slot:", nextSlot)

      // Only merge if they're on the same day and consecutive hours
      const currentDay = new Date(currentSlot.day).toDateString()
      const nextDay = new Date(nextSlot.day).toDateString()
      const currentEndHour = new Date(currentSlot.endTime).getHours()
      const nextStartHour = new Date(nextSlot.startTime).getHours()

      if (currentDay === nextDay && currentEndHour === nextStartHour) {
        console.log("[WeeklySchedule] Merge conditions met - same day and consecutive hours")

        try {
          // Update current slot to extend end time
          const newEndTime = new Date(nextSlot.endTime)
          const response = await fetch(`/api/time-slots/${currentSlot._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            },
            body: JSON.stringify({
              endTime: newEndTime.toISOString(),
              merged: true
            }),
          })

          if (response.ok) {
            // Delete the next slot
            await fetch(`/api/time-slots/${nextSlot._id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
              }
            })

            // Update local state
            setTimeSlots((slots) => {
              const newSlots = [...slots]
              newSlots[slotIndex] = {
                ...currentSlot,
                endTime: newEndTime,
                merged: true,
              }
              newSlots.splice(nextSlotIndex, 1)
              return newSlots
            })

            console.log("[WeeklySchedule] Merge completed successfully")
          }
        } catch (error) {
          console.error('Error merging slots:', error)
        }
      } else {
        console.log("[WeeklySchedule] Merge conditions not met:")
        console.log("[WeeklySchedule] - Same day:", currentDay === nextDay)
        console.log("[WeeklySchedule] - Consecutive hours:", currentEndHour === nextStartHour)
        console.log("[WeeklySchedule] - Current endHour:", currentEndHour, "Next startHour:", nextStartHour)
      }
    } else {
      console.log("[WeeklySchedule] Cannot merge - next slot index out of bounds")
    }
  }

  const handleTaskDrop = async (targetSlotId: string) => {
    console.log("[WeeklySchedule] handleTaskDrop called with targetSlotId:", targetSlotId)
    console.log("[WeeklySchedule] draggedItem:", draggedItem)

    if (!draggedItem || draggedItem.type !== "task") {
      console.log("[WeeklySchedule] No valid dragged item or wrong type")
      return
    }

    const sourceSlotId = draggedItem.data.slotId
    if (sourceSlotId === targetSlotId) {
      console.log("[WeeklySchedule] Same slot, no move needed")
      return
    }

    const sourceSlot = timeSlots.find(s => s._id === sourceSlotId)
    const targetSlot = timeSlots.find(s => s._id === targetSlotId)

    if (!sourceSlot || !targetSlot || !sourceSlot.task) {
      console.log("[WeeklySchedule] Invalid slots or no task to move")
      return
    }

    try {
      // Update target slot with the task
      const targetResponse = await fetch(`/api/time-slots/${targetSlotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          task: sourceSlot.task._id
        }),
      })

      if (targetResponse.ok) {
        // Clear source slot task
        const sourceResponse = await fetch(`/api/time-slots/${sourceSlotId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({
            task: null
          }),
        })

        if (sourceResponse.ok) {
          // Update local state
          setTimeSlots((slots) => {
            return slots.map((slot) => {
              if (slot._id === targetSlotId) {
                return { ...slot, task: sourceSlot.task }
              } else if (slot._id === sourceSlotId) {
                return { ...slot, task: undefined }
              }
              return slot
            })
          })

          console.log("[WeeklySchedule] Task move completed successfully")
        }
      }
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const formatTimeRange = (startTime: Date, endTime: Date) => {
    const formatHour = (date: Date) => {
      const hour = date.getHours()
      if (hour === 12) return "12pm"
      if (hour > 12) return `${hour - 12}pm`
      return `${hour}am`
    }

    const startHour = startTime.getHours()
    const endHour = endTime.getHours()

    if (endHour - startHour === 1) {
      return formatHour(startTime)
    }
    return `${formatHour(startTime)} - ${formatHour(endTime)}`
  }

  const getSlotsByDay = (day: string) => {
    const daySlots = timeSlots.filter((slot) => {
      const slotDay = new Date(slot.day).toLocaleDateString('en-US', { weekday: 'long' })
      return slotDay === day
    })
    console.log("[WeeklySchedule] getSlotsByDay for", day, ":", daySlots.length, "slots")
    console.log("[WeeklySchedule] Slots with tasks:", daySlots.filter(slot => slot.task).length)
    return daySlots
  }

  console.log("[WeeklySchedule] Render - schedule:", schedule, "timeSlots.length:", timeSlots.length, "loading:", loading)
  console.log("[WeeklySchedule] Render - timeSlots sample:", timeSlots.slice(0, 3))
  console.log("[WeeklySchedule] Render - schedule keys:", schedule ? Object.keys(schedule) : "no schedule")

  if (loading) {
    return (
      <Card className="premium-card glow-border light-shadow animate-scale-in">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4 animate-slide-up">
            <div className="p-4 rounded-full bg-primary/10 mx-auto w-fit">
              <Clock className="h-16 w-16 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-xl text-muted-foreground">Loading your schedule...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show warning if existing schedule found
  if (showWarning && existingSchedule) {
    return (
      <Card className="premium-card glow-border-strong light-shadow-lg animate-scale-in">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-6 animate-slide-up max-w-md">
            <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mx-auto w-fit">
              <Clock className="h-16 w-16 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                Schedule Already Exists
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You already have a schedule for this week. Creating a new schedule will replace your existing one and remove all current tasks and time slots.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={handleProceedWithNewSchedule}
                  className="btn-premium bg-red-600 hover:bg-red-700 text-white"
                >
                  Replace Schedule
                </Button>
                <Button
                  onClick={handleCancelNewSchedule}
                  variant="outline"
                  className="btn-premium"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!schedule && timeSlots.length === 0) {
    console.log("[WeeklySchedule] Showing empty state - no schedule and no timeSlots")
    console.log("[WeeklySchedule] Empty state condition: !schedule =", !schedule, "timeSlots.length === 0 =", timeSlots.length === 0)
    return (
      <Card className="premium-card glow-border light-shadow animate-scale-in">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4 animate-slide-up">
            <div className="p-4 rounded-full bg-primary/10 mx-auto w-fit">
              <Clock className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-xl text-muted-foreground">Generate your AI schedule to see it here</p>
              <p className="text-muted-foreground">
                Describe your weekly goals above and let AI create your perfect schedule
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Schedule Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-slide-up">
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-primary gradient-text">
              {timeSlots.filter((slot) => slot.task).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Scheduled Tasks</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-green-600">
              {timeSlots.filter((slot) => slot.task?.completed).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-red-600">
              {timeSlots.filter((slot) => slot.task?.priority === "high").length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">High Priority</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-blue-600">{timeSlots.filter((slot) => slot.merged).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Merged Slots</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-purple-600">{timeSlots.filter((slot) => slot.task && !slot.task.completed).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Pending Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Weekly Schedule
        </h2>
      </div>

      {/* Weekly Grid - 7 Rows for Days, Horizontal Scroll for Time */}
      <div className="w-full">
        <div className="flex">
          {/* Fixed Day Column */}
          <div className="w-40 flex-shrink-0">
            {/* Day Header */}
            <div className="h-16 flex items-center justify-center mb-4">
              <span className="text-lg font-semibold text-muted-foreground">Day</span>
            </div>

            {/* Day Labels */}
            {days.map((day, dayIndex) => {
              const daySlots = getSlotsByDay(day)
              console.log("[WeeklySchedule] Rendering day row:", day, "with", daySlots.length, "slots")

              return (
                <div key={day} className="h-40 mb-4 flex items-center justify-center bg-primary/10 rounded-xl border premium-card glow-border">
                  <div className="text-center">
                    <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {day}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {daySlots.filter((slot) => slot.task).length} tasks
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scrollable Time Columns */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[2400px]">
              {/* Time Headers Row */}
              <div className="flex gap-2 mb-4">
                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2].map((hour) => (
                  <div key={hour} className="w-24 h-16 flex items-center justify-center bg-muted/30 rounded-xl border flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Time Slots Rows */}
              {days.map((day, dayIndex) => {
                const daySlots = getSlotsByDay(day)

                return (
                  <div key={day} className="flex gap-2 mb-4">
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2].map((hour) => {
                      const slot = daySlots.find(s => {
                        const slotHour = new Date(s.startTime).getHours()
                        const slotDate = new Date(s.startTime).toDateString()
                        const currentDate = new Date(s.day).toDateString()

                        // For hours 0, 1, 2, check if the slot is on the next day
                        if (hour === 0 || hour === 1 || hour === 2) {
                          const nextDay = new Date(s.day)
                          nextDay.setDate(nextDay.getDate() + 1)
                          return slotHour === hour && slotDate === nextDay.toDateString()
                        }

                        // For other hours, check if the slot is on the same day
                        return slotHour === hour && slotDate === currentDate
                      })
                      const isSelected = selectedSlot === slot?._id
                      const hasTask = !!slot?.task
                      const isDragOver = dragOverTarget === slot?._id
                      const isDragging = draggedItem?.data?.slotId === slot?._id

                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={cn(
                            "w-24 h-32 border rounded-xl transition-all duration-200 cursor-pointer group relative flex-shrink-0",
                            hasTask
                              ? slot?.task?.completed
                                ? "bg-muted/50 opacity-75"
                                : slot?.task?.eisenhowerCategory
                                  ? eisenhowerColors[slot.task.eisenhowerCategory]
                                  : priorityColors[slot?.task?.priority || "medium"]
                              : "border-dashed border-muted hover:bg-muted/30 hover:border-primary/30",
                            isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                            isDragOver && "drop-zone-active",
                            isDragging && "drag-preview",
                            "premium-card",
                          )}
                          onClick={() => slot && setSelectedSlot(isSelected ? null : slot._id)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            if (slot) {
                              console.log("[WeeklySchedule] Drag over slot:", slot._id)
                              handleDragOver(slot._id)
                            }
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (slot) {
                              console.log("[WeeklySchedule] Drop on slot:", slot._id)
                              handleTaskDrop(slot._id)
                              handleDragEnd()
                            }
                          }}
                        >
                          {/* Task Content */}
                          {hasTask && slot?.task ? (
                            <div
                              className="p-2 h-full flex flex-col"
                              draggable
                              onDragStart={(e) => {
                                if (slot?.task) {
                                  console.log("[WeeklySchedule] Starting drag for task:", slot.task)
                                  handleDragStart({
                                    id: slot.task._id,
                                    type: "task",
                                    data: { slotId: slot._id, task: slot.task },
                                  })
                                }
                              }}
                              onDragEnd={handleDragEnd}
                            >
                              {/* Title Section */}
                              <div className="mb-1">
                                <h4
                                  className={cn(
                                    "text-xs font-bold leading-tight text-pretty line-clamp-2 mb-1",
                                    slot.task?.completed && "line-through opacity-60",
                                    slot.task?.eisenhowerCategory === "urgent-important" && "text-red-700 dark:text-red-300",
                                    slot.task?.eisenhowerCategory === "urgent-not-important" && "text-orange-700 dark:text-orange-300",
                                    slot.task?.eisenhowerCategory === "not-urgent-important" && "text-blue-700 dark:text-blue-300",
                                    slot.task?.eisenhowerCategory === "not-urgent-not-important" && "text-gray-700 dark:text-gray-300"
                                  )}
                                >
                                  {slot.task?.title || "No Title"}
                                </h4>
                              </div>

                              {/* Description Section */}
                              {slot.task?.description && (
                                <div className="mb-1 flex-1 min-h-0">
                                  <p className="text-xs opacity-80 line-clamp-1 text-pretty leading-relaxed">
                                    {slot.task.description}
                                  </p>
                                </div>
                              )}

                              {/* Category Badge */}
                              <div className="mb-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs font-medium px-1 py-0.5 w-fit",
                                    slot.task?.category === "Work" && "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
                                    slot.task?.category === "Health" && "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
                                    slot.task?.category === "Personal" && "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
                                    slot.task?.category === "Learning" && "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
                                    slot.task?.category === "Family" && "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
                                    slot.task?.category === "Break" && "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700"
                                  )}
                                >
                                  {slot.task?.category || "General"}
                                </Badge>
                              </div>


                              {/* Action Buttons */}
                              <div className="flex gap-1 mt-auto pt-1 border-t border-white/10">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 hover:bg-primary/10 focus-ring flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (slot?.task) {
                                      console.log("[WeeklySchedule] Toggling completion for slot:", slot._id, "task:", slot.task)
                                      toggleTaskCompletion(slot._id)
                                    }
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 hover:bg-primary/10 focus-ring flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log("[WeeklySchedule] Merging slot:", slot?._id, "with next")
                                    if (slot) mergeWithNext(slot._id)
                                  }}
                                >
                                  <Merge className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-xs text-muted-foreground">
                                {isDragOver ? "Drop here" : ""}
                              </span>
                            </div>
                          )}

                          {/* Selection Indicator */}
                          {isSelected && <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none" />}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <Card className="premium-card glow-border light-shadow bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4 text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            How to use your schedule:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Drag and drop</strong> tasks between time slots to reschedule
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Click on any task to select it
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Use the ✓ button to mark tasks as complete
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Use the merge button to combine adjacent time slots
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              All changes are automatically saved and tracked in history
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

