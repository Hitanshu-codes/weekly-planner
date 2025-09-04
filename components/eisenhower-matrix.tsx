"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDragDrop } from "@/hooks/use-drag-drop"
import { usePersistentState, useHistory } from "@/hooks/use-persistent-state"

interface Task {
  id: string
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
  const [tasks, setTasks] = usePersistentState<Task[]>("matrix-tasks", [])
  const [newTask, setNewTask] = useState("")
  const [selectedQuadrant, setSelectedQuadrant] = useState<1 | 2 | 3 | 4>(1)

  const { draggedItem, dragOverTarget, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave } = useDragDrop()
  const { addHistoryEntry } = useHistory()

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

  // Get tasks from weekly schedule and convert to matrix format
  const getScheduleTasks = (): Task[] => {
    if (!schedule) return []

    const scheduleTasks: Task[] = []
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    days.forEach((day) => {
      if (schedule[day]) {
        Object.entries(schedule[day]).forEach(([hour, taskData]: [string, any]) => {
          if (taskData && typeof taskData === 'object' && taskData.eisenhowerCategory) {
            scheduleTasks.push({
              id: `schedule-${day}-${hour}`,
              title: taskData.title || "Generated Task",
              description: taskData.description || "",
              category: taskData.category || "General",
              priority: taskData.priority || "medium",
              eisenhowerCategory: taskData.eisenhowerCategory,
              quadrant: getQuadrantFromCategory(taskData.eisenhowerCategory),
              completed: false,
            })
          }
        })
      }
    })

    return scheduleTasks
  }

  // Combine manual tasks with schedule tasks
  const allTasks = [...tasks, ...getScheduleTasks()]

  const addTask = () => {
    if (!newTask.trim()) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask,
      quadrant: selectedQuadrant,
      completed: false,
    }

    setTasks([...tasks, task])
    setNewTask("")

    addHistoryEntry({
      action: "create",
      entityType: "matrixTask",
      entityId: task.id,
      details: {
        description: `Created task "${task.title}" in Q${task.quadrant}`,
        to: { task },
      },
    })
  }

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          const newCompleted = !task.completed

          addHistoryEntry({
            action: "complete",
            entityType: "matrixTask",
            entityId: task.id,
            details: {
              description: `${newCompleted ? "Completed" : "Uncompleted"} matrix task: ${task.title}`,
              from: { completed: task.completed },
              to: { completed: newCompleted },
            },
          })

          return { ...task, completed: newCompleted }
        }
        return task
      }),
    )
  }

  const moveTask = (taskId: string, newQuadrant: 1 | 2 | 3 | 4) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const oldQuadrant = task.quadrant

          addHistoryEntry({
            action: "move",
            entityType: "matrixTask",
            entityId: task.id,
            details: {
              description: `Moved task "${task.title}" from Q${oldQuadrant} to Q${newQuadrant}`,
              from: { quadrant: oldQuadrant },
              to: { quadrant: newQuadrant },
            },
          })

          return { ...task, quadrant: newQuadrant }
        }
        return task
      }),
    )
  }

  const handleQuadrantDrop = (quadrant: 1 | 2 | 3 | 4) => {
    if (!draggedItem || draggedItem.type !== "matrixTask") return

    const taskId = draggedItem.data.id
    moveTask(taskId, quadrant)
  }

  const getTasksByQuadrant = (quadrant: 1 | 2 | 3 | 4) => allTasks.filter((task) => task.quadrant === quadrant)

  return (
    <div className="space-y-8">
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
              <CardContent className="space-y-3">
                {quadrantTasks.map((task, taskIndex) => {
                  const isDragging = draggedItem?.data?.id === task.id

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-4 bg-background/60 backdrop-blur-sm rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md premium-card",
                        task.completed ? "opacity-60 line-through" : "hover:scale-105",
                        isDragging && "drag-preview",
                      )}
                      style={{ animationDelay: `${taskIndex * 0.05}s` }}
                      onClick={() => toggleTask(task.id)}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation()
                        handleDragStart({
                          id: task.id,
                          type: "matrixTask",
                          data: { id: task.id, task },
                        })
                      }}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing transition-opacity hover:opacity-100" />
                          <span className="text-sm flex-1 font-medium text-pretty">{task.title}</span>
                        </div>

                        {/* Task Details */}
                        <div className="ml-8 space-y-1">
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {task.category && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs px-2 py-1",
                                  task.category === "Work" && "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
                                  task.category === "Health" && "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
                                  task.category === "Personal" && "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
                                  task.category === "Learning" && "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
                                  task.category === "Family" && "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
                                  task.category === "Break" && "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700"
                                )}
                              >
                                {task.category}
                              </Badge>
                            )}

                            {task.priority && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs px-2 py-1",
                                  task.priority === "high" && "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
                                  task.priority === "medium" && "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
                                  task.priority === "low" && "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                                )}
                              >
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
            How to use the Priority Matrix:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <strong>Tasks from your AI schedule</strong> automatically appear in their assigned quadrants
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
