import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Task, User } from "@/lib/models"
import jwt from "jsonwebtoken"

// GET /api/tasks - Get all tasks for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as any

    const tasks = await Task.find({ userId: decoded.userId }).sort({ createdAt: -1 })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("[API] Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as any

    const { title, description, priority, category, eisenhowerCategory, duration } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const task = new Task({
      userId: decoded.userId,
      title,
      description: description || "",
      priority: priority || "medium",
      category: category || "Personal",
      eisenhowerCategory: eisenhowerCategory || "not-urgent-not-important",
      duration: duration || 1,
      completed: false,
    })

    const savedTask = await task.save()

    return NextResponse.json(savedTask, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}
