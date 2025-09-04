import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Task, HistoryEntry } from "@/lib/models"

export async function PUT(request: NextRequest) {
    try {
        console.log("[API] Starting task update request")

        const { taskId, updates } = await request.json()
        console.log("[API] Received task update:", { taskId, updates })

        if (!taskId || !updates) {
            console.log("[API] Error: Missing taskId or updates")
            return NextResponse.json({ error: "Task ID and updates are required" }, { status: 400 })
        }

        // Connect to MongoDB
        await connectDB()
        console.log("[API] Connected to MongoDB")

        // Find and update the task
        const task = await Task.findOne({ id: taskId })

        if (!task) {
            console.log("[API] Task not found:", taskId)
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        // Store original values for history
        const originalValues = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            eisenhowerCategory: task.eisenhowerCategory,
            completed: task.completed,
            duration: task.duration
        }

        // Update the task
        const updatedTask = await Task.findOneAndUpdate(
            { id: taskId },
            {
                ...updates,
                updatedAt: new Date()
            },
            { new: true }
        )

        if (!updatedTask) {
            console.log("[API] Failed to update task")
            return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
        }

        // Create history entry
        const historyEntry = new HistoryEntry({
            userId: "default-user", // In a real app, this would come from authentication
            scheduleId: "current-schedule", // In a real app, this would be the current schedule ID
            action: "update",
            entityType: "task",
            entityId: taskId,
            details: {
                description: `Updated task: ${task.title}`,
                from: originalValues,
                to: {
                    title: updatedTask.title,
                    description: updatedTask.description,
                    priority: updatedTask.priority,
                    category: updatedTask.category,
                    eisenhowerCategory: updatedTask.eisenhowerCategory,
                    completed: updatedTask.completed,
                    duration: updatedTask.duration
                }
            }
        })

        await historyEntry.save()

        console.log("[API] Task updated successfully:", updatedTask.id)

        return NextResponse.json({
            success: true,
            task: updatedTask,
            message: "Task updated successfully"
        })

    } catch (error) {
        console.error("[API] Error updating task:", error)
        return NextResponse.json(
            {
                error: "Failed to update task. Please try again.",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}
