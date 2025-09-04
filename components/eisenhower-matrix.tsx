"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, GripVertical, Calendar } from "lucide-react"
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

  const { draggedItem, dragOverTarget, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave } = useDragDrop()

  // Helper function to compare dates and determine if task is scheduled for a specific day
  const isTaskForDate = (scheduledDate: string | Date, createdAt: string | Date, targetDate: Date): boolean => {
    const taskDate = new Date(scheduledDate || createdAt)

    // Convert both dates to YYYY-MM-DD format for comparison
    const targetDateString = targetDate.toISOString().split('T')[0]
    const taskDateString = taskDate.toISOString().split('T')[0]

    return taskDateString === targetDateString
  }

  // Helper function to find the next available day with tasks
  const findNextAvailableDay = (allTasks: any[]): Date => {
    const today = new Date()

    // Check up to 7 days ahead
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)

      const tasksForDay = allTasks.filter(task =>
        isTaskForDate(task.scheduledDate, task.createdAt, checkDate)
      )

      if (tasksForDay.length > 0) {
        return checkDate
      }
    }

    // If no tasks found in the next 7 days, return today
    return today
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

          // Find the next available day with tasks
          const availableDate = findNextAvailableDay(data)
          setDisplayDate(availableDate)

          // Filter tasks for the available date
          const tasksForDate = data.filter((task: any) => {
            const isForDate = isTaskForDate(task.scheduledDate, task.createdAt, availableDate)

            console.log('Date comparison:', {
              taskId: task._id,
              taskTitle: task.title,
              scheduledDate: task.scheduledDate,
              createdAt: task.createdAt,
              availableDate: availableDate.toISOString().split('T')[0],
              isForDate
            })

            return isForDate
          })

          console.log('Filtering tasks for date:', {
            availableDate: availableDate.toISOString(),
            availableDateString: availableDate.toISOString().split('T')[0],
            totalTasks: data.length,
            tasksFound: tasksForDate.length
          })

          console.log('Tasks found for date:', tasksForDate.length)

          // Convert MongoDB tasks to matrix format
          const matrixTasks = tasksForDate.map((task: any) => ({
            ...task,
            quadrant: getQuadrantFromCategory(task.eisenhowerCategory)
          }))
          setTasks(matrixTasks)
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

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

  console.log('Total tasks to display:', {
    totalTasks: allTasks.length,
    tasksByQuadrant: {
      q1: allTasks.filter(t => t.quadrant === 1).length,
      q2: allTasks.filter(t => t.quadrant === 2).length,
      q3: allTasks.filter(t => t.quadrant === 3).length,
      q4: allTasks.filter(t => t.quadrant === 4).length
    }
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
          scheduledDate: new Date().toISOString()
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

  return (
    <div className="space-y-8">
      {/* Today's Date Display */}
      <Card className="premium-card glow-border light-shadow animate-scale-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {displayDate.toDateString() === new Date().toDateString() ? "Today's Tasks" : "Upcoming Tasks"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Showing tasks scheduled for {displayDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {displayDate.toDateString() !== new Date().toDateString() && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (No tasks for today)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {tasks.length} tasks
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Add Task Form */}
      <Card className="premium-card glow-border-strong light-shadow-lg animate-scale-in">
        <CardHeader>
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Add New Task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Enter task description..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTask()}
              className="flex-1 h-12 text-base focus-ring premium-card"
            />
            <select
              value={selectedQuadrant}
              onChange={(e) => setSelectedQuadrant(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="px-4 py-3 border border-input bg-background rounded-lg text-base focus-ring premium-card min-w-fit"
            >
              <option value={1}>Q1: Urgent + Important</option>
              <option value={2}>Q2: Not Urgent + Important</option>
              <option value={3}>Q3: Urgent + Not Important</option>
              <option value={4}>Q4: Not Urgent + Not Important</option>
            </select>
            <Button onClick={addTask} className="btn-premium h-12 px-6 focus-ring">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Eisenhower Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
        {([1, 2, 3, 4] as const).map((quadrant, index) => {
          const config = quadrantConfig[quadrant]
          const quadrantTasks = getTasksByQuadrant(quadrant)
          const isDragOver = dragOverTarget === `quadrant-${quadrant}`

          return (
            <Card
              key={quadrant}
              className={cn(
                config.color,
                "min-h-[400px] transition-all duration-300 premium-card glow-border light-shadow",
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
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className={cn(
                    "text-lg font-bold",
                    quadrant === 1 && "bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent",
                    quadrant === 2 && "bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent",
                    quadrant === 3 && "bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent",
                    quadrant === 4 && "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                  )}>
                    Q{quadrant}
                  </span>
                  <Badge variant={config.badge as any} className="text-sm px-3 py-1">
                    {quadrantTasks.length}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground font-medium">{config.title}</p>
                {isDragOver && <p className="text-sm text-primary font-semibold animate-pulse">Drop task here</p>}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {quadrantTasks.map((task, taskIndex) => {
                    const isDragging = draggedItem?.data?.id === task._id

                    return (
                      <div
                        key={task._id}
                        className={cn(
                          "p-3 bg-background/60 backdrop-blur-sm rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md premium-card",
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
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing transition-opacity hover:opacity-100 flex-shrink-0" />
                            <span className="text-xs font-medium text-pretty line-clamp-2">{task.title}</span>
                          </div>

                          {/* Task Details */}
                          {task.description && (
                            <div className="ml-6">
                              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {quadrantTasks.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-12 animate-pulse">
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
        <CardContent className="p-6">
          <h3 className="font-bold mb-4 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Priority Matrix:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Today's tasks</strong> are shown first, or the next available day with tasks
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
