"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

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
        <div className="space-y-2">
            {/* Title Input */}
            <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Task title"
                className="text-xs font-bold w-full bg-transparent border-b border-primary/30 focus:border-primary focus:outline-none"
                autoFocus
                required
            />

            {/* Description Input */}
            <textarea
                value={formData.description || ""}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Description (optional)"
                className="text-xs w-full bg-transparent border-b border-primary/20 focus:border-primary focus:outline-none resize-none"
                rows={2}
            />

            {/* Priority Select */}
            <select
                value={formData.priority || "medium"}
                onChange={(e) => handleInputChange('priority', e.target.value as "high" | "medium" | "low")}
                className="text-xs w-full bg-transparent border-b border-primary/20 focus:border-primary focus:outline-none"
            >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
            </select>

            {/* Category Select */}
            <select
                value={formData.category || "General"}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="text-xs w-full bg-transparent border-b border-primary/20 focus:border-primary focus:outline-none"
            >
                <option value="Work">Work</option>
                <option value="Health">Health</option>
                <option value="Personal">Personal</option>
                <option value="Learning">Learning</option>
                <option value="Family">Family</option>
                <option value="Break">Break</option>
                <option value="General">General</option>
            </select>

            {/* Action Buttons */}
            <div className="flex gap-1 mt-2">
                <Button
                    type="button"
                    size="sm"
                    className="h-5 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
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
                    size="sm"
                    variant="outline"
                    className="h-5 px-2 text-xs"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
            </div>
        </div>
    )
}
