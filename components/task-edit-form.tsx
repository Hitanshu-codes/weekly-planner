"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { X, Calendar, Clock, Tag, AlertCircle } from "lucide-react"

interface Task {
    _id: string
    uuid: string
    title: string
    description?: string
    priority: "high" | "medium" | "low"
    category: string
    eisenhowerCategory?: "urgent-important" | "urgent-not-important" | "not-urgent-important" | "not-urgent-not-important"
    completed: boolean
    duration: number
    scheduledDate?: Date
}

interface TaskEditFormProps {
    taskData: Partial<Task>
    onSave: (data: Partial<Task>) => void
    onCancel: () => void
    isEditing?: boolean
    saveButtonText?: string
}

export function TaskEditForm({
    taskData,
    onSave,
    onCancel,
    isEditing = false,
    saveButtonText = "Save"
}: TaskEditFormProps) {
    const [formData, setFormData] = useState<Partial<Task>>(taskData)

    // Sync form data with props when they change
    useEffect(() => {
        console.log('TaskEditForm: taskData prop changed to:', taskData)
        setFormData(taskData)
    }, [taskData])

    console.log('TaskEditForm rendered with:', { taskData, formData, saveButtonText })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Form submitted with data:', formData)
        if (formData.title?.trim()) {
            console.log('Calling onSave with:', formData)
            onSave(formData)
        } else {
            console.log('Title is empty, not saving')
        }
    }

    const handleInputChange = (field: keyof Task, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md premium-card glow-border-strong light-shadow-lg animate-scale-in">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {isEditing ? "Edit Task" : "Create New Task"}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={onCancel}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-primary" />
                                Task Title *
                            </label>
                            <input
                                type="text"
                                value={formData.title || ""}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                placeholder="Enter task title..."
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-foreground placeholder:text-muted-foreground"
                                autoFocus
                                required
                            />
                        </div>

                        {/* Description Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Description
                            </label>
                            <textarea
                                value={formData.description || ""}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Add a description (optional)..."
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-foreground placeholder:text-muted-foreground resize-none"
                                rows={3}
                            />
                        </div>

                        {/* Priority and Category Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Priority Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-primary" />
                                    Priority
                                </label>
                                <select
                                    value={formData.priority || "medium"}
                                    onChange={(e) => handleInputChange('priority', e.target.value as "high" | "medium" | "low")}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-foreground appearance-none cursor-pointer"
                                >
                                    <option value="low" className="bg-background text-foreground">Low Priority</option>
                                    <option value="medium" className="bg-background text-foreground">Medium Priority</option>
                                    <option value="high" className="bg-background text-foreground">High Priority</option>
                                </select>
                            </div>

                            {/* Category Select */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-primary" />
                                    Category
                                </label>
                                <select
                                    value={formData.category || "General"}
                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-foreground appearance-none cursor-pointer"
                                >
                                    <option value="Work" className="bg-background text-foreground">Work</option>
                                    <option value="Health" className="bg-background text-foreground">Health</option>
                                    <option value="Personal" className="bg-background text-foreground">Personal</option>
                                    <option value="Learning" className="bg-background text-foreground">Learning</option>
                                    <option value="Family" className="bg-background text-foreground">Family</option>
                                    <option value="Break" className="bg-background text-foreground">Break</option>
                                    <option value="General" className="bg-background text-foreground">General</option>
                                </select>
                            </div>
                        </div>

                        {/* Duration Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                Duration (hours)
                            </label>
                            <input
                                type="number"
                                min="0.5"
                                max="8"
                                step="0.5"
                                value={formData.duration || 1}
                                onChange={(e) => handleInputChange('duration', parseFloat(e.target.value) || 1)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors text-foreground"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                className="flex-1 btn-premium bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('Create/Save button clicked')
                                    console.log('Current form data:', formData)
                                    if (formData.title?.trim()) {
                                        console.log('Calling onSave with:', formData)
                                        onSave(formData)
                                    } else {
                                        console.log('Title is empty, not saving')
                                    }
                                }}
                            >
                                {saveButtonText}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 btn-premium"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
