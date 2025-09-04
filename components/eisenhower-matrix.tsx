"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, GripVertical, Calendar, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDragDrop } from "@/hooks/use-drag-drop"
import { EisenhowerCategory } from "@/lib/models"

interface Task {
  _id: string
  uuid: string
  title: string
  quadrant: 1 | 2 | 3 | 4
  completed: boolean
  description?: string
  category?: string
  priority?: "high" | "medium" | "low"
  eisenhowerCategory?: "urgent-important" | "urgent-not-important" | "not-urgent-important" | "not-urgent-not-important"
  day?: string // e.g., "Saturday"
  time?: number // e.g., 22 (hour in 24-hour format)
}

const quadrantConfig = {
  1: {
    title: "Urgent + Important",
    color: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
    badge: "destructive",
  },
  2: {
    title: "Not Urgent + Important",
    color: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    badge: "default",
  },
  3: {
    title: "Urgent + Not Important",
    color: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
    badge: "secondary",
  },
  4: {
    title: "Not Urgent + Not Important",
    color: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
    badge: "outline",
  },
}

interface EisenhowerMatrixProps {
  schedule?: any
}

export function EisenhowerMatrix({ schedule }: EisenhowerMatrixProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState("")
  const [selectedQuadrant, setSelectedQuadrant] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(true)
  const [displayDate, setDisplayDate] = useState<Date>(new Date())
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const { draggedItem, dragOverTarget, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave } = useDragDrop()

  // Helper function to compare dates using custom day format (4 AM to 2 AM next day)
  const isTaskForDate = (taskDay: string, targetDate: Date): boolean => {
    // Get the day name from the target date directly
    const targetDayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' })

    console.log('Day comparison (4 AM to 2 AM cycle):', {
      taskDay: taskDay,
      targetDayName: targetDayName,
      targetDate: targetDate.toDateString(),
      match: taskDay === targetDayName
    })

    return taskDay === targetDayName
  }

  // Helper function to find the next available day with tasks (using 4 AM to 2 AM cycle)
  const findNextAvailableDay = (allTasks: any[]): Date => {
    const now = new Date()
    const currentHour = now.getHours()

    // Determine the current "day" based on 4 AM to 2 AM cycle
    let currentDay = new Date(now)
    if (currentHour >= 2 && currentHour < 4) {
      // Between 2 AM and 4 AM, we're still in the previous day's cycle
      currentDay.setDate(now.getDate() - 1)
    }

    console.log('Finding available day for', allTasks.length, 'total tasks (4 AM to 2 AM cycle)')
    console.log('Current hour:', currentHour, 'Current day cycle:', currentDay.toDateString())

    // First, check if there are tasks for the current day cycle
    const currentDayTasks = allTasks.filter(task =>
      task.day && isTaskForDate(task.day, currentDay)
    )

    console.log('Tasks for current day cycle:', currentDayTasks.length)
    if (currentDayTasks.length > 0) {
      return currentDay
    }

    // If no tasks for current day cycle, check the next 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(currentDay)
      checkDate.setDate(currentDay.getDate() + i)

      const tasksForDay = allTasks.filter(task =>
        task.day && isTaskForDate(task.day, checkDate)
      )

      console.log(`Tasks for day +${i}:`, tasksForDay.length, 'date:', checkDate.toLocaleDateString('en-CA'))

      if (tasksForDay.length > 0) {
        return checkDate
      }
    }

    // If no tasks found in the next 7 days, check the previous 7 days
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(currentDay)
      checkDate.setDate(currentDay.getDate() - i)

      const tasksForDay = allTasks.filter(task =>
        task.day && isTaskForDate(task.day, checkDate)
      )

      console.log(`Tasks for day -${i}:`, tasksForDay.length, 'date:', checkDate.toLocaleDateString('en-CA'))

      if (tasksForDay.length > 0) {
        return checkDate
      }
    }

    // If no tasks found anywhere, return current day
    console.log('No tasks found in any day, returning current day')
    return currentDay
  }

  // Function to fetch and filter tasks for a specific date
  const fetchTasksForDate = async (targetDate: Date) => {
    try {
      const response = await fetch('/api/tasks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()

        console.log('Filtering tasks for date:', targetDate.toLocaleDateString('en-CA'))
        console.log('Target day name:', targetDate.toLocaleDateString('en-US', { weekday: 'long' }))

        // Filter tasks for the target date using simplified day format
        const tasksForDate = data.filter((task: any) => {
          const matches = task.day && isTaskForDate(task.day, targetDate)
          console.log(`Task "${task.title}" (day: ${task.day}) matches ${targetDate.toLocaleDateString('en-US', { weekday: 'long' })}:`, matches)
          return matches
        })

        console.log('Task filtering results for', targetDate.toLocaleDateString('en-CA'), ':', {
          totalTasks: data.length,
          tasksForDate: tasksForDate.length,
          sampleTasks: tasksForDate.slice(0, 3).map((t: any) => ({
            id: t._id,
            title: t.title,
            day: t.day,
            time: t.time
          }))
        })

        // Convert MongoDB tasks to matrix format
        const matrixTasks = tasksForDate.map((task: any) => ({
          ...task,
          quadrant: getQuadrantFromCategory(task.eisenhowerCategory)
        }))
        setTasks(matrixTasks)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  // Fetch tasks from MongoDB and filter for today only
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        })
        if (response.ok) {
          const data = await response.json()

          console.log('Raw task data from API:', {
            totalTasks: data.length,
            sampleTasks: data.slice(0, 3).map((t: any) => ({
              id: t._id,
              title: t.title,
              day: t.day,
              eisenhowerCategory: t.eisenhowerCategory
            }))
          })

          // Find the next available day with tasks
          const availableDate = findNextAvailableDay(data)
          setDisplayDate(availableDate)

          // Filter tasks for the available date
          await fetchTasksForDate(availableDate)
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, []) // Only run once on mount

  // Set up interval to check for new day cycle (every hour)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const currentHour = now.getHours()

      // Check if we've entered a new day cycle (4 AM to 2 AM)
      // If it's 4 AM, refresh tasks
      if (currentHour === 4) {
        console.log('New day cycle detected (4 AM), refreshing tasks...')

        // Fetch tasks and update display date
        const fetchTasks = async () => {
          try {
            const response = await fetch('/api/tasks', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
              }
            })
            if (response.ok) {
              const data = await response.json()
              const availableDate = findNextAvailableDay(data)
              setDisplayDate(availableDate)
              await fetchTasksForDate(availableDate)
            }
          } catch (error) {
            console.error('Error fetching tasks:', error)
          }
        }

        fetchTasks()
      }
    }, 60 * 60 * 1000) // Check every hour

    return () => clearInterval(interval)
  }, []) // Only run once on mount

  // Update current time every minute
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timeInterval)
  }, [])

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDatePicker) {
        const target = event.target as Element
        if (!target.closest('.date-picker-container')) {
          setShowDatePicker(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDatePicker])

  // Convert eisenhowerCategory to quadrant number
  const getQuadrantFromCategory = (category: string): 1 | 2 | 3 | 4 => {
    switch (category) {
      case "urgent-important": return 1
      case "not-urgent-important": return 2
      case "urgent-not-important": return 3
      case "not-urgent-not-important": return 4
      default: return 4
    }
  }

  // Convert quadrant number to eisenhowerCategory
  const getCategoryFromQuadrant = (quadrant: 1 | 2 | 3 | 4): string => {
    switch (quadrant) {
      case 1: return "urgent-important"
      case 2: return "not-urgent-important"
      case 3: return "urgent-not-important"
      case 4: return "not-urgent-not-important"
      default: return "not-urgent-not-important"
    }
  }

  // Use only tasks from database (schedule tasks are now saved to database with proper scheduledDate)
  const allTasks = tasks

  console.log('Total tasks to display for', displayDate.toLocaleDateString('en-CA'), ':', {
    totalTasks: allTasks.length,
    displayDate: displayDate.toDateString(),
    tasksByQuadrant: {
      q1: allTasks.filter(t => t.quadrant === 1).length,
      q2: allTasks.filter(t => t.quadrant === 2).length,
      q3: allTasks.filter(t => t.quadrant === 3).length,
      q4: allTasks.filter(t => t.quadrant === 4).length
    },
    sampleTasks: allTasks.slice(0, 3).map(t => ({
      id: t._id,
      title: t.title,
      day: t.day,
      quadrant: t.quadrant
    }))
  })

  const addTask = async () => {
    if (!newTask.trim()) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          title: newTask,
          eisenhowerCategory: getCategoryFromQuadrant(selectedQuadrant),
          day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          time: new Date().getHours()
        }),
      })

      if (response.ok) {
        const newTaskData = await response.json()
        const matrixTask = {
          ...newTaskData,
          quadrant: selectedQuadrant,
        }
        setTasks([...tasks, matrixTask])
        setNewTask("")
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t._id === id)
    if (!task) return

    const newCompleted = !task.completed

    try {
      const response = await fetch(`/api/tasks/${id}`, {
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
        setTasks(
          tasks.map((t) => {
            if (t._id === id) {
              return { ...t, completed: newCompleted }
            }
            return t
          }),
        )
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const moveTask = async (taskId: string, newQuadrant: 1 | 2 | 3 | 4) => {
    const task = tasks.find(t => t._id === taskId)
    if (!task) return

    const newEisenhowerCategory = getCategoryFromQuadrant(newQuadrant)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          eisenhowerCategory: newEisenhowerCategory
        }),
      })

      if (response.ok) {
        setTasks(
          tasks.map((t) => {
            if (t._id === taskId) {
              return { ...t, quadrant: newQuadrant, eisenhowerCategory: newEisenhowerCategory as EisenhowerCategory }
            }
            return t
          }),
        )
      }
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const handleQuadrantDrop = (quadrant: 1 | 2 | 3 | 4) => {
    if (!draggedItem || draggedItem.type !== "matrixTask") return

    const taskId = draggedItem.data.id
    moveTask(taskId, quadrant)
  }

  const getTasksByQuadrant = (quadrant: 1 | 2 | 3 | 4) => allTasks.filter((task) => task.quadrant === quadrant)

  // Handle date selection from calendar
  const handleDateSelect = async (selectedDate: Date) => {
    setDisplayDate(selectedDate)
    setShowDatePicker(false)
    await fetchTasksForDate(selectedDate)
  }

  // Handle calendar icon click
  const handleCalendarClick = () => {
    setShowDatePicker(!showDatePicker)
  }

  return (
    <div className="space-y-6 sm:space-y-8 overflow-hidden">
      {/* Date Display and Selector */}
      <Card className="premium-card glow-border light-shadow animate-scale-in">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleCalendarClick}
                className={cn(
                  "date-picker-container p-2 rounded-lg transition-colors cursor-pointer group flex-shrink-0",
                  showDatePicker
                    ? "bg-primary/20 border-2 border-primary/30"
                    : "bg-primary/10 hover:bg-primary/20"
                )}
                title="Click to select date"
              >
                <Calendar className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 transition-colors",
                  showDatePicker
                    ? "text-primary"
                    : "text-primary group-hover:text-primary/80"
                )} />
              </button>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h3 className="font-semibold text-base sm:text-lg truncate">
                  {displayDate.toDateString() === new Date().toDateString() ? "Today's Tasks" : "Scheduled Tasks"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-tight break-words">
                  Showing tasks for {displayDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })} (4 AM - 2 AM cycle)
                  {displayDate.toDateString() !== new Date().toDateString() && (
                    <span className="block sm:inline sm:ml-2 text-blue-600 dark:text-blue-400 font-medium">
                      (Next available day)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1 break-words">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })} • {(() => {
                    const hour = currentTime.getHours()
                    if (hour >= 4 && hour < 24) return "Active day"
                    if (hour >= 0 && hour < 2) return "Active day"
                    return "Transition period"
                  })()}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 relative">
              {showDatePicker && (
                <div className="date-picker-container absolute top-full right-0 mt-2 z-50 bg-background border border-input rounded-lg shadow-lg p-3 sm:p-4 min-w-[280px] max-w-[90vw] overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Select Date</h4>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="date"
                      value={displayDate.toLocaleDateString('en-CA')}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value)
                        handleDateSelect(newDate)
                      }}
                      className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm focus-ring"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const today = new Date()
                          handleDateSelect(today)
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Today
                      </Button>
                      <Button
                        onClick={() => {
                          const yesterday = new Date()
                          yesterday.setDate(yesterday.getDate() - 1)
                          handleDateSelect(yesterday)
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Yesterday
                      </Button>
                      <Button
                        onClick={() => {
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          handleDateSelect(tomorrow)
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        Tomorrow
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {displayDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <Button
                  onClick={handleCalendarClick}
                  variant="outline"
                  size="sm"
                  className="date-picker-container btn-premium text-xs"
                >
                  Change Date
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {displayDate.toDateString() !== new Date().toDateString() && (
                  <>
                    <Badge variant="secondary" className="text-xs sm:text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      Next Available Day
                    </Badge>
                    <Button
                      onClick={() => {
                        const today = new Date()
                        setDisplayDate(today)
                        fetchTasksForDate(today)
                      }}
                      variant="outline"
                      size="sm"
                      className="btn-premium text-xs"
                    >
                      Go to Today
                    </Button>
                  </>
                )}
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {tasks.length} tasks
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Task Form */}
      {/* <Card className="premium-card glow-border-strong light-shadow-lg animate-scale-in">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Add New Task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <Input
              placeholder="Enter task description..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTask()}
              className="flex-1 h-10 sm:h-12 text-sm sm:text-base focus-ring premium-card"
            />
            <div className="flex gap-3 sm:gap-4">
              <select
                value={selectedQuadrant}
                onChange={(e) => setSelectedQuadrant(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-input bg-background rounded-lg text-sm sm:text-base focus-ring premium-card"
              >
                <option value={1}>Q1: Urgent + Important</option>
                <option value={2}>Q2: Not Urgent + Important</option>
                <option value={3}>Q3: Urgent + Not Important</option>
                <option value={4}>Q4: Not Urgent + Not Important</option>
              </select>
              <Button onClick={addTask} className="btn-premium h-10 sm:h-12 px-4 sm:px-6 focus-ring flex-shrink-0">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Eisenhower Matrix Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6 animate-fade-in overflow-hidden">
        {([1, 2, 3, 4] as const).map((quadrant, index) => {
          const config = quadrantConfig[quadrant]
          const quadrantTasks = getTasksByQuadrant(quadrant)
          const isDragOver = dragOverTarget === `quadrant-${quadrant}`

          return (
            <Card
              key={quadrant}
              className={cn(
                config.color,
                "min-h-[280px] sm:min-h-[320px] md:min-h-[380px] transition-all duration-300 premium-card glow-border light-shadow overflow-hidden",
                isDragOver && "drop-zone-active scale-105",
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
              onDragOver={(e) => {
                e.preventDefault()
                handleDragOver(`quadrant-${quadrant}`)
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault()
                handleQuadrantDrop(quadrant)
                handleDragEnd()
              }}
            >
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm sm:text-base md:text-lg font-bold",
                    quadrant === 1 && "bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent",
                    quadrant === 2 && "bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent",
                    quadrant === 3 && "bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent",
                    quadrant === 4 && "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                  )}>
                    Q{quadrant}
                  </span>
                  <Badge variant={config.badge as any} className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                    {quadrantTasks.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight">{config.title}</p>
                {isDragOver && <p className="text-xs sm:text-sm text-primary font-semibold animate-pulse">Drop task here</p>}
              </CardHeader>
              <CardContent className="p-2 sm:p-4 overflow-hidden">
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3 min-h-0">
                  {quadrantTasks.map((task, taskIndex) => {
                    const isDragging = draggedItem?.data?.id === task._id

                    return (
                      <div
                        key={task._id}
                        className={cn(
                          "p-2 sm:p-3 bg-background/60 backdrop-blur-sm rounded-lg sm:rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md premium-card overflow-hidden",
                          task.completed ? "opacity-60 line-through" : "hover:scale-105",
                          isDragging && "drag-preview",
                        )}
                        style={{ animationDelay: `${taskIndex * 0.05}s` }}
                        onClick={() => toggleTask(task._id)}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          handleDragStart({
                            id: task._id,
                            type: "matrixTask",
                            data: { id: task._id, task },
                          })
                        }}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="space-y-1 sm:space-y-2 min-h-0">
                          <div className="flex items-center gap-1 sm:gap-2 min-h-0">
                            <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground cursor-grab active:cursor-grabbing transition-opacity hover:opacity-100 flex-shrink-0" />
                            <span className="text-xs font-medium text-pretty line-clamp-2 leading-tight break-words min-w-0 flex-1">{task.title}</span>
                          </div>

                          {/* Task Details */}
                          {task.description && (
                            <div className="ml-4 sm:ml-6 min-h-0">
                              <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 break-words">{task.description}</p>
                            </div>
                          )}

                          {/* Day and Time Info */}
                          {(task.day || task.time !== undefined) && (
                            <div className="ml-4 sm:ml-6 min-h-0">
                              <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                                {task.day && (
                                  <span className="px-1 sm:px-1.5 py-0.5 bg-primary/10 rounded text-primary font-medium text-xs whitespace-nowrap">
                                    {task.day}
                                  </span>
                                )}
                                {task.time !== undefined && (
                                  <span className="px-1 sm:px-1.5 py-0.5 bg-secondary/10 rounded text-secondary-foreground font-medium text-xs whitespace-nowrap">
                                    {task.time === 0 ? '12am' : task.time === 12 ? '12pm' : task.time > 12 ? `${task.time - 12}pm` : `${task.time}am`}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {quadrantTasks.length === 0 && (
                  <div className="text-xs sm:text-sm text-muted-foreground text-center py-8 sm:py-12 animate-pulse">
                    {isDragOver ? "Drop task here" : "No tasks in this quadrant"}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Instructions */}
      <Card className="premium-card glow-border light-shadow bg-gradient-to-r from-primary/5 to-primary/10 animate-slide-up">
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-bold mb-3 sm:mb-4 text-base sm:text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Priority Matrix:
          </h3>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Click the calendar icon</strong> or "Change Date" button to select any date and view tasks for that day
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Today's tasks</strong> are shown first (using 4 AM to 2 AM day cycle). If no tasks exist for the current day cycle, the next available day with tasks is displayed
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Drag and drop</strong> tasks between quadrants to reprioritize them
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Click on tasks to mark them as complete
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Focus on Q1 (urgent + important) tasks first
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Schedule Q2 (important but not urgent) tasks to prevent them becoming Q1
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              All changes are automatically saved and tracked
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
