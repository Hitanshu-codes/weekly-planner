"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Check, Merge, GripVertical, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDragDrop } from "@/hooks/use-drag-drop"
import { usePersistentState, useHistory } from "@/hooks/use-persistent-state"

interface Task {
  id: string
  title: string
  description?: string
  priority: "high" | "medium" | "low"
  category: string
  eisenhowerCategory?: "urgent-important" | "urgent-not-important" | "not-urgent-important" | "not-urgent-not-important"
  completed: boolean
  duration: number // in hours
}

interface TimeSlot {
  id: string
  day: string
  startHour: number
  endHour: number
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

export function WeeklySchedule({ schedule }: ScheduleProps) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const [timeSlots, setTimeSlots, slotsLoaded] = usePersistentState<TimeSlot[]>("weekly-schedule", [])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  console.log("[WeeklySchedule] Component render - schedule:", schedule, "slotsLoaded:", slotsLoaded, "timeSlots.length:", timeSlots.length)

  const { draggedItem, dragOverTarget, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave } = useDragDrop()
  const { addHistoryEntry, getHistoryByWeek } = useHistory()

  useEffect(() => {
    console.log("[WeeklySchedule] useEffect triggered")
    console.log("[WeeklySchedule] slotsLoaded:", slotsLoaded)
    console.log("[WeeklySchedule] schedule prop:", schedule)
    console.log("[WeeklySchedule] schedule type:", typeof schedule)
    console.log("[WeeklySchedule] schedule keys:", schedule ? Object.keys(schedule) : "no schedule")
    console.log("[WeeklySchedule] schedule stringified:", JSON.stringify(schedule, null, 2))
    console.log("[WeeklySchedule] current timeSlots:", timeSlots)

    if (!slotsLoaded || !schedule) {
      console.log("[WeeklySchedule] Early return - slotsLoaded:", slotsLoaded, "schedule:", !!schedule)
      return
    }

    const slots: TimeSlot[] = []
    console.log("[WeeklySchedule] Creating new slots from schedule")
    console.log("[WeeklySchedule] Days to iterate:", days)
    console.log("[WeeklySchedule] Schedule days available:", Object.keys(schedule))

    days.forEach((day) => {
      for (let hour = 8; hour <= 21; hour++) {
        const slotId = `${day}-${hour}`

        // Check if we already have this slot in persistent storage
        const existingSlot = timeSlots.find((slot) => slot.id === slotId)

        if (existingSlot) {
          slots.push(existingSlot)
        } else {
          let task: Task | undefined

          // Parse schedule data if available
          console.log("[WeeklySchedule] Checking if schedule has day:", day, "Result:", !!schedule[day])
          if (schedule[day]) {
            const daySchedule = schedule[day]
            console.log("[WeeklySchedule] Day schedule keys:", Object.keys(daySchedule))
            console.log("[WeeklySchedule] Day schedule for", day, ":", daySchedule)

            // Try different time formats
            const timeFormats = [
              hour.toString(),
              `${hour}:00`,
              `${hour}am`,
              `${hour}pm`,
              `${hour}:00am`,
              `${hour}:00pm`
            ]

            console.log("[WeeklySchedule] Trying time formats for hour", hour, ":", timeFormats)

            let taskData = null
            for (const format of timeFormats) {
              if (daySchedule[format]) {
                taskData = daySchedule[format]
                console.log("[WeeklySchedule] Found task data with format", format, ":", taskData)
                break
              }
            }

            // If no task found with time formats, try to find any task for this day
            if (!taskData && Object.keys(daySchedule).length > 0) {
              console.log("[WeeklySchedule] No time-based task found, checking for any task data")
              const firstKey = Object.keys(daySchedule)[0]
              const firstTask = daySchedule[firstKey]
              if (firstTask && typeof firstTask === "object") {
                console.log("[WeeklySchedule] Using first available task as fallback:", firstTask)
                taskData = firstTask
              }
            }

            if (taskData) {
              console.log("[WeeklySchedule] Creating task from taskData:", taskData)
              task = {
                id: `task-${slotId}`,
                title: taskData.title || taskData.task || "Generated Task",
                description: taskData.description || "",
                priority: taskData.priority || "medium",
                category: taskData.category || "General",
                eisenhowerCategory: taskData.eisenhowerCategory || "not-urgent-not-important",
                completed: false,
                duration: taskData.duration || 1,
              }

              console.log("[WeeklySchedule] Created task:", task)

              // Log task creation
              addHistoryEntry({
                action: "create",
                entityType: "task",
                entityId: task.id,
                details: {
                  description: `Created task: ${task.title} in ${day} at ${hour}:00`,
                  to: { slotId, task },
                },
              })
            }
          }

          const newSlot = {
            id: slotId,
            day,
            startHour: hour,
            endHour: hour + 1,
            task,
            merged: false,
          }

          console.log("[WeeklySchedule] Creating new slot:", newSlot)
          slots.push(newSlot)
        }
      }
    })

    console.log("[WeeklySchedule] Final slots array:", slots)
    console.log("[WeeklySchedule] Final slots array length:", slots.length)
    console.log("[WeeklySchedule] Setting timeSlots with:", slots)
    setTimeSlots(slots)
  }, [schedule, slotsLoaded])

  const toggleTaskCompletion = (slotId: string) => {
    console.log("[WeeklySchedule] toggleTaskCompletion called for slotId:", slotId)
    setTimeSlots((slots) => {
      const newSlots = slots.map((slot) => {
        if (slot.id === slotId && slot.task) {
          const newCompleted = !slot.task.completed
          console.log("[WeeklySchedule] Toggling task completion:", slot.task.title, "from", slot.task.completed, "to", newCompleted)

          // Log completion action
          addHistoryEntry({
            action: "complete",
            entityType: "task",
            entityId: slot.task.id,
            details: {
              description: `${newCompleted ? "Completed" : "Uncompleted"} task: ${slot.task.title}`,
              from: { completed: slot.task.completed },
              to: { completed: newCompleted },
            },
          })

          return { ...slot, task: { ...slot.task, completed: newCompleted } }
        }
        return slot
      })

      console.log("[WeeklySchedule] Updated slots after completion toggle:", newSlots.length)
      return newSlots
    })
  }

  const mergeWithNext = (slotId: string) => {
    console.log("[WeeklySchedule] mergeWithNext called for slotId:", slotId)
    const slotIndex = timeSlots.findIndex((slot) => slot.id === slotId)
    const nextSlotIndex = slotIndex + 1

    console.log("[WeeklySchedule] Slot indices - current:", slotIndex, "next:", nextSlotIndex, "total slots:", timeSlots.length)

    if (nextSlotIndex < timeSlots.length) {
      const currentSlot = timeSlots[slotIndex]
      const nextSlot = timeSlots[nextSlotIndex]

      console.log("[WeeklySchedule] Current slot:", currentSlot, "Next slot:", nextSlot)

      // Only merge if they're on the same day and consecutive hours
      if (currentSlot.day === nextSlot.day && currentSlot.endHour === nextSlot.startHour) {
        console.log("[WeeklySchedule] Merge conditions met - same day and consecutive hours")
        console.log("[WeeklySchedule] Merging slots - current:", currentSlot, "next:", nextSlot)
        setTimeSlots((slots) => {
          const newSlots = [...slots]
          // Extend current slot
          newSlots[slotIndex] = {
            ...currentSlot,
            endHour: nextSlot.endHour,
            merged: true,
          }
          // Remove next slot
          newSlots.splice(nextSlotIndex, 1)

          console.log("[WeeklySchedule] Merged slot result:", newSlots[slotIndex])

          // Log merge action
          addHistoryEntry({
            action: "merge",
            entityType: "timeSlot",
            entityId: currentSlot.id,
            details: {
              description: `Merged ${currentSlot.day} ${currentSlot.startHour}:00 with ${nextSlot.startHour}:00`,
              from: { slots: [currentSlot, nextSlot] },
              to: { mergedSlot: newSlots[slotIndex] },
            },
          })

          console.log("[WeeklySchedule] Merge completed successfully")
          return newSlots
        })
      } else {
        console.log("[WeeklySchedule] Merge conditions not met:")
        console.log("[WeeklySchedule] - Same day:", currentSlot.day === nextSlot.day)
        console.log("[WeeklySchedule] - Consecutive hours:", currentSlot.endHour === nextSlot.startHour)
        console.log("[WeeklySchedule] - Current endHour:", currentSlot.endHour, "Next startHour:", nextSlot.startHour)
      }
    } else {
      console.log("[WeeklySchedule] Cannot merge - next slot index out of bounds")
    }
  }

  const handleTaskDrop = (targetSlotId: string) => {
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

    setTimeSlots((slots) => {
      const newSlots = [...slots]
      const sourceIndex = newSlots.findIndex((slot) => slot.id === sourceSlotId)
      const targetIndex = newSlots.findIndex((slot) => slot.id === targetSlotId)

      if (sourceIndex === -1 || targetIndex === -1) return slots

      const sourceSlot = newSlots[sourceIndex]
      const targetSlot = newSlots[targetIndex]

      // Move task from source to target
      if (sourceSlot.task) {
        console.log("[WeeklySchedule] Moving task:", sourceSlot.task.title, "from", sourceSlotId, "to", targetSlotId)
        newSlots[targetIndex] = { ...targetSlot, task: sourceSlot.task }
        newSlots[sourceIndex] = { ...sourceSlot, task: undefined }

        // Log move action
        addHistoryEntry({
          action: "move",
          entityType: "task",
          entityId: sourceSlot.task.id,
          details: {
            description: `Moved task "${sourceSlot.task.title}" from ${sourceSlot.day} ${sourceSlot.startHour}:00 to ${targetSlot.day} ${targetSlot.startHour}:00`,
            from: { slotId: sourceSlotId },
            to: { slotId: targetSlotId },
          },
        })

        console.log("[WeeklySchedule] Task move completed successfully")
      } else {
        console.log("[WeeklySchedule] No task to move in source slot")
      }

      return newSlots
    })
  }

  const formatTimeRange = (startHour: number, endHour: number) => {
    const formatHour = (hour: number) => {
      if (hour === 12) return "12pm"
      if (hour > 12) return `${hour - 12}pm`
      return `${hour}am`
    }

    if (endHour - startHour === 1) {
      return formatHour(startHour)
    }
    return `${formatHour(startHour)} - ${formatHour(endHour)}`
  }

  const getSlotsByDay = (day: string) => {
    const daySlots = timeSlots.filter((slot) => slot.day === day)
    console.log("[WeeklySchedule] getSlotsByDay for", day, ":", daySlots.length, "slots")
    return daySlots
  }

  const weekHistory = getHistoryByWeek(new Date())

  console.log("[WeeklySchedule] Render - schedule:", schedule, "timeSlots.length:", timeSlots.length, "slotsLoaded:", slotsLoaded)
  console.log("[WeeklySchedule] Render - timeSlots sample:", timeSlots.slice(0, 3))
  console.log("[WeeklySchedule] Render - schedule keys:", schedule ? Object.keys(schedule) : "no schedule")

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
            <div className="text-3xl font-bold text-purple-600">{weekHistory.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Actions This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* History Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Weekly Schedule
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 btn-premium focus-ring"
        >
          <History className="h-4 w-4" />
          {showHistory ? "Hide" : "Show"} History
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && (
        <Card className="premium-card glow-border light-shadow animate-slide-up">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Activity History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {weekHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No activity recorded this week</p>
              ) : (
                weekHistory.slice(0, 20).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 premium-card rounded-lg">
                    <div className="text-xs text-muted-foreground font-mono min-w-fit">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-sm flex-1 text-pretty">{entry.details.description}</div>
                    <Badge variant="outline" className="text-xs">
                      {entry.action}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="min-w-[1800px]">
              {/* Time Headers Row */}
              <div className="flex gap-4 mb-4">
                {Array.from({ length: 14 }, (_, i) => i + 8).map((hour) => (
                  <div key={hour} className="w-36 h-16 flex items-center justify-center bg-muted/30 rounded-xl border flex-shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">
                      {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Time Slots Rows */}
              {days.map((day, dayIndex) => {
                const daySlots = getSlotsByDay(day)

                return (
                  <div key={day} className="flex gap-4 mb-4">
                    {Array.from({ length: 14 }, (_, i) => i + 8).map((hour) => {
                      const slot = daySlots.find(s => s.startHour === hour)
                      const isSelected = selectedSlot === slot?.id
                      const hasTask = !!slot?.task
                      const isDragOver = dragOverTarget === slot?.id
                      const isDragging = draggedItem?.data?.slotId === slot?.id

                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={cn(
                            "w-36 h-40 border rounded-xl transition-all duration-200 cursor-pointer group relative flex-shrink-0",
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
                          onClick={() => slot && setSelectedSlot(isSelected ? null : slot.id)}
                          onDragOver={(e) => {
                            e.preventDefault()
                            if (slot) {
                              console.log("[WeeklySchedule] Drag over slot:", slot.id)
                              handleDragOver(slot.id)
                            }
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (slot) {
                              console.log("[WeeklySchedule] Drop on slot:", slot.id)
                              handleTaskDrop(slot.id)
                              handleDragEnd()
                            }
                          }}
                        >
                          {/* Task Content */}
                          {hasTask && slot?.task ? (
                            <div
                              className="p-3 h-full flex flex-col"
                              draggable
                              onDragStart={(e) => {
                                if (slot?.task) {
                                  console.log("[WeeklySchedule] Starting drag for task:", slot.task)
                                  handleDragStart({
                                    id: slot.task.id,
                                    type: "task",
                                    data: { slotId: slot.id, task: slot.task },
                                  })
                                }
                              }}
                              onDragEnd={handleDragEnd}
                            >
                              {/* Title Section */}
                              <div className="mb-2">
                                <h4
                                  className={cn(
                                    "text-sm font-bold leading-tight text-pretty line-clamp-2 mb-1",
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
                                <div className="mb-2 flex-1 min-h-0">
                                  <p className="text-xs opacity-80 line-clamp-2 text-pretty leading-relaxed">
                                    {slot.task.description}
                                  </p>
                                </div>
                              )}

                              {/* Category Badge */}
                              <div className="mb-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs font-medium px-2 py-1 w-fit",
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
                              <div className="flex gap-1 mt-auto pt-2 border-t border-white/10">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 hover:bg-primary/10 focus-ring flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (slot?.task) {
                                      console.log("[WeeklySchedule] Toggling completion for slot:", slot.id, "task:", slot.task)
                                      toggleTaskCompletion(slot.id)
                                    }
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 hover:bg-primary/10 focus-ring flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log("[WeeklySchedule] Merging slot:", slot?.id, "with next")
                                    if (slot) mergeWithNext(slot.id)
                                  }}
                                >
                                  <Merge className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-sm text-muted-foreground">
                                {isDragOver ? "Drop task here" : "Empty slot"}
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

