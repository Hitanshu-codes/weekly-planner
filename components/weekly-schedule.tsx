"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Check, Merge, GripVertical, History, Trash2, Edit3, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDragDrop } from "@/hooks/use-drag-drop"
import { TaskEditForm } from "@/components/task-edit-form"

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
  day?: string // e.g., "Saturday"
  time?: number // e.g., 22 (hour in 24-hour format)
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

  // Otherwise, include from today until Sunday (including Sunday)
  const daysToInclude = []

  // Add days from current day to Saturday
  for (let i = currentDay; i <= 6; i++) {
    daysToInclude.push(allDays[i])
  }

  // Always add Sunday at the end (unless today is already Sunday)
  if (currentDay !== 0) {
    daysToInclude.push('Sunday')
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editingTaskData, setEditingTaskData] = useState<Partial<Task>>({})
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState<string | null>(null)
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({
    title: "",
    description: "",
    priority: "medium",
    category: "General",
    eisenhowerCategory: "not-urgent-not-important",
    duration: 1
  })
  const [mergeSelection, setMergeSelection] = useState<{
    startSlotId: string | null
    endSlotId: string | null
    isSelecting: boolean
  }>({
    startSlotId: null,
    endSlotId: null,
    isSelecting: false
  })
  const [isProcessingSchedule, setIsProcessingSchedule] = useState(false)

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
    if (!schedule || isProcessingSchedule) return

    setIsProcessingSchedule(true)
    console.log("[WeeklySchedule] Starting schedule processing...")

    try {
      // Fetch all existing data once to avoid multiple API calls
      const [existingTasksResponse, existingTimeSlotsResponse] = await Promise.all([
        fetch('/api/tasks', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        }),
        fetch('/api/time-slots', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        })
      ])

      const existingTasks = existingTasksResponse.ok ? await existingTasksResponse.json() : []
      const existingTimeSlots = existingTimeSlotsResponse.ok ? await existingTimeSlotsResponse.json() : []

      console.log(`[WeeklySchedule] Found ${existingTasks.length} existing tasks and ${existingTimeSlots.length} existing time slots`)

      const slots: TimeSlot[] = []

      for (const day of days) {
        // Create time slots for custom time range: 4am to 2am next day (22 hours)
        // Hours: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2
        const hours = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2]

        for (const hour of hours) {
          const slotId = `${day}-${hour}`

          // Check if we already have this slot in current state
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
                // Check if task already exists in database for this day and time
                const existingTask = existingTasks.find((t: any) =>
                  t.day === day &&
                  t.time === hour &&
                  t.title === (taskData.title || taskData.task || "Generated Task")
                )

                if (existingTask) {
                  console.log(`[WeeklySchedule] Using existing task for ${day} ${hour}:00:`, existingTask.title)
                  task = existingTask
                } else {
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

                  console.log(`[WeeklySchedule] Creating new task for ${day} ${hour}:00:`, taskData.title || taskData.task || "Generated Task")

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
                      day: day,
                      time: hour,
                    }),
                  })

                  if (response.ok) {
                    task = await response.json()
                    console.log(`[WeeklySchedule] Created new task:`, task?.title)
                  }
                }
              }
            }

            // Check if time slot already exists in database
            // Calculate the expected start time for this slot
            const today = new Date()
            const currentDayOfWeek = today.getDay()
            const dayNameToNumber = {
              'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
              'Friday': 5, 'Saturday': 6, 'Sunday': 0
            }
            const targetDayNumber = dayNameToNumber[day as keyof typeof dayNameToNumber]
            let daysToAdd = targetDayNumber - currentDayOfWeek
            if (daysToAdd <= 0) daysToAdd += 7

            const dayDate = new Date(today)
            dayDate.setDate(today.getDate() + daysToAdd)

            let actualDayDate = new Date(dayDate)
            if (hour === 0 || hour === 1 || hour === 2) {
              actualDayDate.setDate(dayDate.getDate() + 1)
            }

            const expectedStartTime = new Date(actualDayDate)
            expectedStartTime.setHours(hour, 0, 0, 0)

            const existingTimeSlot = existingTimeSlots.find((ts: any) => {
              const tsStartTime = new Date(ts.startTime)
              return tsStartTime.getTime() === expectedStartTime.getTime()
            })

            if (existingTimeSlot) {
              console.log(`[WeeklySchedule] Using existing time slot for ${day} ${hour}:00`)
              slots.push(existingTimeSlot)
            } else {
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

              console.log(`[WeeklySchedule] Creating new time slot for ${day} ${hour}:00`)

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
      }

      setTimeSlots(slots)
      console.log("[WeeklySchedule] Schedule processing completed successfully")
    } catch (error) {
      console.error('Error processing new schedule:', error)
    } finally {
      setIsProcessingSchedule(false)
    }
  }

  // Handle user cancellation
  const handleCancelNewSchedule = () => {
    setShowWarning(false)
    setExistingSchedule(null)
  }

  // Delete entire schedule
  const deleteSchedule = async () => {
    try {
      // Delete all time slots
      for (const slot of timeSlots) {
        await fetch(`/api/time-slots/${slot._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        })
      }

      // Delete all tasks
      const taskIds = timeSlots
        .filter(slot => slot.task)
        .map(slot => slot.task!._id)

      for (const taskId of taskIds) {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        })
      }

      // Delete the schedule record if it exists
      if (existingSchedule) {
        await fetch(`/api/schedules/${existingSchedule._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        })
      }

      // Clear local state
      setTimeSlots([])
      setExistingSchedule(null)
      setShowDeleteConfirm(false)

      console.log('Schedule deleted successfully')
    } catch (error) {
      console.error('Error deleting schedule:', error)
    }
  }

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(true)
  }

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  // Handle task edit
  const handleEditTask = (task: Task) => {
    setEditingTask(task._id)
    setEditingTaskData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      eisenhowerCategory: task.eisenhowerCategory,
      duration: task.duration
    })
  }

  // Handle comprehensive task edit
  const handleComprehensiveEdit = (task: Task) => {
    setEditingTask(task._id)
    setEditingTaskData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      eisenhowerCategory: task.eisenhowerCategory,
      duration: task.duration
    })
  }

  // Handle task edit save
  const handleSaveTaskEdit = async (taskData: Partial<Task>) => {
    if (!editingTask || !taskData.title) return

    try {
      console.log('Updating task:', editingTask, 'with data:', taskData)

      const response = await fetch(`/api/tasks/${editingTask}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        const updatedTask = await response.json()
        console.log('Task updated successfully:', updatedTask)

        // Update local state
        setTimeSlots((slots) => {
          return slots.map((slot) => {
            if (slot.task && slot.task._id === editingTask) {
              return { ...slot, task: updatedTask }
            }
            return slot
          })
        })

        setEditingTask(null)
        setEditingTaskData({})
        console.log('Task updated successfully')
      } else {
        const errorData = await response.text()
        console.error('Failed to update task:', errorData)
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Handle task edit cancel
  const handleCancelTaskEdit = () => {
    setEditingTask(null)
    setEditingTaskData({})
  }

  // Handle task delete
  const handleDeleteTask = async (taskId: string) => {
    try {
      // Delete the task
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      })

      if (response.ok) {
        // Update local state - remove task from slot
        setTimeSlots((slots) => {
          return slots.map((slot) => {
            if (slot.task && slot.task._id === taskId) {
              return { ...slot, task: undefined }
            }
            return slot
          })
        })

        setShowTaskDeleteConfirm(null)
        console.log('Task deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Handle creating new task in empty slot
  const handleCreateTask = async (slotId: string, taskData: Partial<Task>) => {
    console.log('handleCreateTask called with slotId:', slotId, 'taskData:', taskData)

    if (!taskData.title?.trim()) {
      console.log('Task title is required')
      return
    }

    try {
      const slot = timeSlots.find(s => s._id === slotId)
      if (!slot) {
        console.log('Slot not found')
        return
      }

      console.log('Creating task for slot:', slotId, 'with data:', taskData)
      console.log('Slot startTime:', slot.startTime, 'type:', typeof slot.startTime)

      // Get day and time from slot
      const slotDay = new Date(slot.day).toLocaleDateString('en-US', { weekday: 'long' })
      const slotTime = new Date(slot.startTime).getHours()
      console.log('Slot day:', slotDay, 'time:', slotTime)

      // Create new task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          title: taskData.title.trim(),
          description: taskData.description || "",
          priority: taskData.priority || "medium",
          category: taskData.category || "General",
          eisenhowerCategory: taskData.eisenhowerCategory || "not-urgent-not-important",
          duration: taskData.duration || 1,
          day: slotDay,
          time: slotTime,
        }),
      })

      if (response.ok) {
        const newTask = await response.json()
        console.log('Task created successfully:', newTask)

        // Update time slot with new task
        const slotResponse = await fetch(`/api/time-slots/${slotId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({
            task: newTask._id
          }),
        })

        if (slotResponse.ok) {
          const updatedSlot = await slotResponse.json()
          console.log('Time slot updated successfully:', updatedSlot)

          // Update local state
          setTimeSlots((slots) => {
            return slots.map((s) => {
              if (s._id === slotId) {
                return { ...s, task: newTask }
              }
              return s
            })
          })

          setEditingSlot(null)
          setNewTaskData({
            title: "",
            description: "",
            priority: "medium" as const,
            category: "General",
            eisenhowerCategory: "not-urgent-not-important" as const,
            duration: 1
          })
          console.log('New task created and associated with slot successfully')
        } else {
          console.error('Failed to update time slot:', await slotResponse.text())
        }
      } else {
        const errorData = await response.text()
        console.error('Failed to create task:', errorData)
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // Handle starting edit for empty slot
  const handleStartSlotEdit = (slotId: string) => {
    console.log('Starting slot edit for:', slotId)
    setEditingSlot(slotId)
    const initialData = {
      title: "",
      description: "",
      priority: "medium" as const,
      category: "General",
      eisenhowerCategory: "not-urgent-not-important" as const,
      duration: 1
    }
    setNewTaskData(initialData)
    console.log('Set newTaskData to:', initialData)
  }

  // Handle canceling slot edit
  const handleCancelSlotEdit = () => {
    setEditingSlot(null)
    setNewTaskData({
      title: "",
      description: "",
      priority: "medium" as const,
      category: "General",
      eisenhowerCategory: "not-urgent-not-important" as const,
      duration: 1
    })
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
  }, [schedule]) // Removed 'loading' dependency to prevent multiple triggers

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
        console.log("[WeeklySchedule] Task completion updated successfully, new completed state:", newCompleted)
        setTimeSlots((slots) => {
          return slots.map((s) => {
            if (s._id === slotId && s.task) {
              console.log("[WeeklySchedule] Updating slot:", s._id, "task completion to:", newCompleted)
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

  // Enhanced merge function that can merge multiple consecutive slots
  const mergeSlots = async (startSlotId: string, endSlotId: string) => {
    console.log("[WeeklySchedule] mergeSlots called for startSlotId:", startSlotId, "endSlotId:", endSlotId)

    const startSlot = timeSlots.find(s => s._id === startSlotId)
    const endSlot = timeSlots.find(s => s._id === endSlotId)

    if (!startSlot || !endSlot) {
      console.log("[WeeklySchedule] Start or end slot not found")
      return
    }

    // Find all slots between start and end (inclusive) that are on the same day and consecutive
    const startDay = new Date(startSlot.day).toDateString()
    const endDay = new Date(endSlot.day).toDateString()

    if (startDay !== endDay) {
      console.log("[WeeklySchedule] Cannot merge slots across different days")
      return
    }

    // Get all slots for the same day
    const daySlots = timeSlots.filter(slot => {
      const slotDay = new Date(slot.day).toDateString()
      return slotDay === startDay
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    // Find the range of slots to merge
    const startIndex = daySlots.findIndex(slot => slot._id === startSlotId)
    const endIndex = daySlots.findIndex(slot => slot._id === endSlotId)

    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
      console.log("[WeeklySchedule] Invalid slot range")
      return
    }

    const slotsToMerge = daySlots.slice(startIndex, endIndex + 1)

    // Check if all slots are consecutive
    for (let i = 0; i < slotsToMerge.length - 1; i++) {
      const currentEndHour = new Date(slotsToMerge[i].endTime).getHours()
      const nextStartHour = new Date(slotsToMerge[i + 1].startTime).getHours()

      if (currentEndHour !== nextStartHour) {
        console.log("[WeeklySchedule] Slots are not consecutive, cannot merge")
        return
      }
    }

    console.log("[WeeklySchedule] Merge conditions met - merging", slotsToMerge.length, "consecutive slots")

    try {
      // Determine which slot has a task (prioritize the first slot with a task)
      const taskToKeep = slotsToMerge.find(slot => slot.task)?.task || null
      const taskIdToKeep = taskToKeep?._id || null

      // Update the first slot to extend end time to cover all merged slots
      const newEndTime = new Date(slotsToMerge[slotsToMerge.length - 1].endTime)
      const response = await fetch(`/api/time-slots/${startSlotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          endTime: newEndTime.toISOString(),
          task: taskIdToKeep,
          merged: true
        }),
      })

      if (response.ok) {
        // Update all other slots in the range to have the same task and mark as merged
        const updatePromises = slotsToMerge.slice(1).map(slot =>
          fetch(`/api/time-slots/${slot._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
            },
            body: JSON.stringify({
              task: taskIdToKeep,
              merged: true
            }),
          })
        )

        await Promise.all(updatePromises)

        // Update local state - all slots now have the same task
        setTimeSlots((slots) => {
          return slots.map((slot) => {
            if (slotsToMerge.some(mergeSlot => mergeSlot._id === slot._id)) {
              return {
                ...slot,
                task: taskToKeep || undefined, // Convert null to undefined for TypeScript compatibility
                merged: true,
                // Only the first slot gets the extended end time
                endTime: slot._id === startSlotId ? newEndTime : slot.endTime
              }
            }
            return slot
          })
        })

        console.log("[WeeklySchedule] Merge completed successfully -", slotsToMerge.length, "slots now have same content")
      }
    } catch (error) {
      console.error('Error merging slots:', error)
    }
  }

  // Legacy function for backward compatibility (merges only 2 slots)
  const mergeWithNext = async (currentSlotId: string, nextSlotId: string) => {
    await mergeSlots(currentSlotId, nextSlotId)
  }

  // Handle starting merge selection
  const handleStartMergeSelection = (slotId: string) => {
    setMergeSelection({
      startSlotId: slotId,
      endSlotId: slotId,
      isSelecting: true
    })
  }

  // Handle extending merge selection
  const handleExtendMergeSelection = (slotId: string) => {
    if (!mergeSelection.isSelecting || !mergeSelection.startSlotId) return

    setMergeSelection(prev => ({
      ...prev,
      endSlotId: slotId
    }))
  }

  // Handle completing merge selection
  const handleCompleteMergeSelection = async () => {
    if (!mergeSelection.startSlotId || !mergeSelection.endSlotId) return

    await mergeSlots(mergeSelection.startSlotId, mergeSelection.endSlotId)
    setMergeSelection({
      startSlotId: null,
      endSlotId: null,
      isSelecting: false
    })
  }

  // Handle canceling merge selection
  const handleCancelMergeSelection = () => {
    setMergeSelection({
      startSlotId: null,
      endSlotId: null,
      isSelecting: false
    })
  }

  // Check if a slot is in the merge selection range
  const isSlotInMergeRange = (slotId: string) => {
    if (!mergeSelection.isSelecting || !mergeSelection.startSlotId || !mergeSelection.endSlotId) {
      return false
    }

    const startSlot = timeSlots.find(s => s._id === mergeSelection.startSlotId)
    const endSlot = timeSlots.find(s => s._id === mergeSelection.endSlotId)
    const currentSlot = timeSlots.find(s => s._id === slotId)

    if (!startSlot || !endSlot || !currentSlot) return false

    // Check if all slots are on the same day
    const startDay = new Date(startSlot.day).toDateString()
    const endDay = new Date(endSlot.day).toDateString()
    const currentDay = new Date(currentSlot.day).toDateString()

    if (startDay !== endDay || startDay !== currentDay) return false

    // Get all slots for the same day and sort by time
    const daySlots = timeSlots.filter(slot => {
      const slotDay = new Date(slot.day).toDateString()
      return slotDay === startDay
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const startIndex = daySlots.findIndex(slot => slot._id === mergeSelection.startSlotId)
    const endIndex = daySlots.findIndex(slot => slot._id === mergeSelection.endSlotId)
    const currentIndex = daySlots.findIndex(slot => slot._id === slotId)

    if (startIndex === -1 || endIndex === -1 || currentIndex === -1) return false

    // Check if current slot is between start and end (inclusive)
    const minIndex = Math.min(startIndex, endIndex)
    const maxIndex = Math.max(startIndex, endIndex)

    return currentIndex >= minIndex && currentIndex <= maxIndex
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
      // Try multiple ways to get the day name to be more robust
      const slotDayFromDay = new Date(slot.day).toLocaleDateString('en-US', { weekday: 'long' })
      const slotDayFromStartTime = new Date(slot.startTime).toLocaleDateString('en-US', { weekday: 'long' })

      // Return true if either day matches
      return slotDayFromDay === day || slotDayFromStartTime === day
    })
    console.log("[WeeklySchedule] getSlotsByDay for", day, ":", daySlots.length, "slots")
    console.log("[WeeklySchedule] Slots with tasks:", daySlots.filter(slot => slot.task).length)
    return daySlots
  }

  // Simple function to count tasks for a specific day
  const getTaskCountForDay = (day: string) => {
    const taskCount = timeSlots.filter((slot) => {
      // Try multiple ways to get the day name to be more robust
      const slotDayFromDay = new Date(slot.day).toLocaleDateString('en-US', { weekday: 'long' })
      const slotDayFromStartTime = new Date(slot.startTime).toLocaleDateString('en-US', { weekday: 'long' })

      // Return true if either day matches AND slot has a task
      return (slotDayFromDay === day || slotDayFromStartTime === day) && slot.task
    }).length

    console.log(`[WeeklySchedule] Task count for ${day}:`, taskCount)
    return taskCount
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

  // Show delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <Card className="premium-card glow-border-strong light-shadow-lg animate-scale-in">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-6 animate-slide-up max-w-md">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto w-fit">
              <Trash2 className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Delete Schedule?
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Are you sure you want to delete your entire weekly schedule? This will permanently remove all tasks and time slots. This action cannot be undone.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={deleteSchedule}
                  className="btn-premium bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, Delete Schedule
                </Button>
                <Button
                  onClick={handleDeleteCancel}
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

  // Show task delete confirmation modal
  if (showTaskDeleteConfirm) {
    const taskToDelete = timeSlots.find(slot => slot.task?._id === showTaskDeleteConfirm)?.task
    return (
      <Card className="premium-card glow-border-strong light-shadow-lg animate-scale-in">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-6 animate-slide-up max-w-md">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto w-fit">
              <X className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Delete Task?
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={() => handleDeleteTask(showTaskDeleteConfirm)}
                  className="btn-premium bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, Delete Task
                </Button>
                <Button
                  onClick={() => setShowTaskDeleteConfirm(null)}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 animate-slide-up">
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-3 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-primary gradient-text">
              {timeSlots.filter((slot) => slot.task).length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Scheduled Tasks</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-3 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-green-600">
              {timeSlots.filter((slot) => slot.task?.completed).length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-3 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-red-600">
              {timeSlots.filter((slot) => slot.task?.priority === "high").length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">High Priority</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-3 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{timeSlots.filter((slot) => slot.merged).length}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Merged Slots</p>
          </CardContent>
        </Card>
        <Card className="premium-card glow-border light-shadow">
          <CardContent className="p-3 sm:p-6">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">{timeSlots.filter((slot) => slot.task && !slot.task.completed).length}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Pending Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Weekly Schedule
        </h2>
        {timeSlots.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            {!mergeSelection.isSelecting && (
              <Button
                onClick={() => handleStartMergeSelection('')}
                variant="outline"
                size="sm"
                className="btn-premium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-xs sm:text-sm"
              >
                <Merge className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Merge Multiple Slots</span>
                <span className="sm:hidden">Merge Slots</span>
              </Button>
            )}
            <Button
              onClick={handleDeleteConfirm}
              variant="outline"
              size="sm"
              className="btn-premium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-300 dark:border-red-700 text-xs sm:text-sm"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Delete Schedule</span>
              <span className="sm:hidden">Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Merge Selection Controls */}
      {mergeSelection.isSelecting && (
        <Card className="premium-card glow-border light-shadow bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Start: {mergeSelection.startSlotId ? 'Selected' : 'Not selected'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium">End: {mergeSelection.endSlotId ? 'Selected' : 'Not selected'}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Click on slots to select range, then click merge button to combine
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCompleteMergeSelection}
                  size="sm"
                  className="btn-premium bg-green-600 hover:bg-green-700 text-white"
                  disabled={!mergeSelection.startSlotId || !mergeSelection.endSlotId}
                >
                  <Merge className="h-4 w-4 mr-2" />
                  Merge Slots
                </Button>
                <Button
                  onClick={handleCancelMergeSelection}
                  variant="outline"
                  size="sm"
                  className="btn-premium"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Grid - Mobile Optimized */}
      <div className="w-full">
        <div className="flex flex-col lg:flex-row">
          {/* Fixed Day Column - Hidden on mobile, shown on large screens */}
          <div className="hidden lg:block w-40 flex-shrink-0 mr-4">
            {/* Day Header */}
            <div className="h-16 flex items-center justify-center mb-4">
              <span className="text-lg font-semibold text-muted-foreground">Day</span>
            </div>

            {/* Day Labels */}
            {days.map((day, dayIndex) => {
              const taskCount = getTaskCountForDay(day)
              console.log("[WeeklySchedule] Rendering day row:", day, "with", taskCount, "tasks")

              return (
                <div key={day} className="h-32 mb-4 flex items-center justify-center bg-primary/10 rounded-xl border premium-card glow-border w-full">
                  <div className="text-center">
                    <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {day}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {taskCount} tasks
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scrollable Time Columns */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[2400px] lg:min-w-[2400px]">
              {/* Time Headers Row */}
              <div className="flex items-center gap-1 mb-4">
                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2].map((hour, hourIndex) => {
                  const nextHour = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2][hourIndex + 1]
                  const hasNextHour = nextHour !== undefined

                  return (
                    <div key={hour} className="flex items-center">
                      {/* Time Header Card */}
                      <div className="w-32 sm:w-40 h-12 sm:h-16 flex items-center justify-center bg-muted/30 rounded-lg sm:rounded-xl border flex-shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">
                          {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                        </span>
                      </div>

                      {/* Spacer for merge button alignment */}
                      {hasNextHour && (
                        <div className="w-6 h-6 flex items-center justify-center mx-1">
                          {/* Empty space to align with merge buttons below */}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Time Slots Rows */}
              {days.map((day, dayIndex) => {
                const daySlots = getSlotsByDay(day)
                const taskCount = getTaskCountForDay(day)

                return (
                  <div key={day} className="flex items-center gap-1 mb-4">
                    {/* Mobile Day Indicator - Only visible on mobile */}
                    <div className="lg:hidden w-20 sm:w-24 flex-shrink-0 mr-2">
                      <div className="h-24 sm:h-32 flex flex-col items-center justify-center bg-primary/10 rounded-lg sm:rounded-xl border premium-card glow-border">
                        <div className="text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center">
                          {day.substring(0, 3)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {taskCount}
                        </div>
                      </div>
                    </div>
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2].map((hour, hourIndex) => {
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

                      // Get next slot for merge button
                      const nextHour = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2][hourIndex + 1]
                      const nextSlot = nextHour !== undefined ? daySlots.find(s => {
                        const slotHour = new Date(s.startTime).getHours()
                        const slotDate = new Date(s.startTime).toDateString()
                        const currentDate = new Date(s.day).toDateString()

                        if (nextHour === 0 || nextHour === 1 || nextHour === 2) {
                          const nextDay = new Date(s.day)
                          nextDay.setDate(nextDay.getDate() + 1)
                          return slotHour === nextHour && slotDate === nextDay.toDateString()
                        }
                        return slotHour === nextHour && slotDate === currentDate
                      }) : null

                      const canMerge = nextSlot && slot && !slot.merged && !nextSlot.merged
                      const hasNextHour = nextHour !== undefined
                      const isInMergeRange = isSlotInMergeRange(slot?._id || '')
                      const isMergeStart = mergeSelection.startSlotId === slot?._id
                      const isMergeEnd = mergeSelection.endSlotId === slot?._id

                      return (
                        <div key={`${day}-${hour}`} className="flex items-center">
                          {/* Time Slot Card */}
                          <div
                            className={cn(
                              "w-32 sm:w-40 h-24 sm:h-32 border rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer group relative flex-shrink-0",
                              hasTask
                                ? slot?.task?.completed
                                  ? "border-2 border-green-400 shadow-[0_0_0_2px_rgba(34,197,94,0.3)] dark:border-green-500 dark:shadow-[0_0_0_2px_rgba(34,197,94,0.4)]"
                                  : slot?.task?.eisenhowerCategory
                                    ? eisenhowerColors[slot.task.eisenhowerCategory]
                                    : priorityColors[slot?.task?.priority || "medium"]
                                : "border-dashed border-muted hover:bg-muted/30 hover:border-primary/30",
                              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                              isDragOver && "drop-zone-active",
                              isDragging && "drag-preview",
                              isInMergeRange && "ring-2 ring-blue-400 ring-offset-2 ring-offset-background bg-blue-50/50 dark:bg-blue-950/20",
                              isMergeStart && "ring-2 ring-green-400 ring-offset-2 ring-offset-background bg-green-50/50 dark:bg-green-950/20",
                              isMergeEnd && "ring-2 ring-purple-400 ring-offset-2 ring-offset-background bg-purple-50/50 dark:bg-purple-950/20",
                              "premium-card",
                            )}
                            data-completed={slot?.task?.completed}
                            data-task-id={slot?.task?._id}
                            data-debug-classes={slot?.task?.completed ? "completed-green" : "not-completed"}
                            onClick={() => {
                              if (slot) {
                                if (mergeSelection.isSelecting) {
                                  // Handle merge selection
                                  if (!mergeSelection.startSlotId) {
                                    handleStartMergeSelection(slot._id)
                                  } else {
                                    handleExtendMergeSelection(slot._id)
                                  }
                                } else if (slot.task) {
                                  // If card has a task, toggle completion
                                  console.log("[WeeklySchedule] Toggling completion for slot:", slot._id, "task:", slot.task, "current completed:", slot.task.completed)
                                  console.log("[WeeklySchedule] Current classes would be:", slot.task.completed ? "completed (should be green)" : "not completed")
                                  toggleTaskCompletion(slot._id)
                                } else {
                                  // If card is empty, toggle selection
                                  setSelectedSlot(isSelected ? null : slot._id)
                                }
                              }
                            }}
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
                                className="p-1 sm:p-2 h-full flex flex-col relative group"
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
                                {/* Action Buttons - Show on hover */}
                                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-0.5 sm:gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 sm:h-5 sm:w-5 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (slot?.task) {
                                        handleComprehensiveEdit(slot.task)
                                      }
                                    }}
                                  >
                                    <Edit3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600 dark:text-blue-400" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 sm:h-5 sm:w-5 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (slot?.task) {
                                        setShowTaskDeleteConfirm(slot.task._id)
                                      }
                                    }}
                                  >
                                    <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-600 dark:text-red-400" />
                                  </Button>
                                </div>

                                {/* Task Content - No inline editing */}
                                {editingTask === slot.task._id ? (
                                  <div className="p-1 sm:p-2 h-full flex flex-col relative group">
                                    <div className="text-center text-sm text-muted-foreground">
                                      Editing...
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Title Section */}
                                    <div className="mb-1 pr-6 sm:pr-8">
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
                                  </>
                                )}


                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full relative group">
                                {editingSlot === slot?._id ? (
                                  <div className="text-center text-sm text-muted-foreground">
                                    Creating...
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-xs text-muted-foreground">
                                      {isDragOver ? "Drop here" : ""}
                                    </span>
                                    {/* Add Task Button - Show on hover */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-4 w-4 sm:h-5 sm:w-5 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (slot) {
                                          handleStartSlotEdit(slot._id)
                                        }
                                      }}
                                    >
                                      <Edit3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-600 dark:text-green-400" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Selection Indicator */}
                            {isSelected && <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none" />}
                          </div>

                          {/* Merge Button (between cards) - Always show for consistency */}
                          {hasNextHour && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-5 w-5 sm:h-6 sm:w-6 p-0 mx-0.5 sm:mx-1",
                                canMerge || mergeSelection.isSelecting
                                  ? "hover:bg-primary/10 focus-ring cursor-pointer"
                                  : "opacity-30 cursor-not-allowed"
                              )}
                              disabled={!canMerge && !mergeSelection.isSelecting}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (mergeSelection.isSelecting) {
                                  // Complete the merge selection
                                  handleCompleteMergeSelection()
                                } else if (canMerge) {
                                  // Start merge selection with current and next slot
                                  handleStartMergeSelection(slot._id)
                                  handleExtendMergeSelection(nextSlot._id)
                                  handleCompleteMergeSelection()
                                }
                              }}
                            >
                              <Merge className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </Button>
                          )}
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
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-bold mb-3 sm:mb-4 text-base sm:text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            How to use your schedule:
          </h3>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Drag and drop</strong> tasks between time slots to reschedule
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Click on any task to mark it as complete
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Hover over tasks</strong> to see edit and delete buttons
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Edit tasks</strong> to modify title, description, priority, and category
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Hover over empty slots</strong> to create new tasks
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Use the merge button to combine adjacent time slots, or click "Merge Multiple Slots" to select a range
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              All changes are automatically saved and tracked in history
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Popup Forms */}
      {editingTask && (
        <TaskEditForm
          taskData={editingTaskData}
          onSave={handleSaveTaskEdit}
          onCancel={handleCancelTaskEdit}
          isEditing={true}
          saveButtonText="Save"
        />
      )}

      {editingSlot && (
        <TaskEditForm
          taskData={newTaskData}
          onSave={(data) => {
            if (editingSlot) {
              handleCreateTask(editingSlot, data)
            }
          }}
          onCancel={handleCancelSlotEdit}
          isEditing={false}
          saveButtonText="Create"
        />
      )}
    </div>
  )
}

