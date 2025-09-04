import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Task, User } from "@/lib/models"

// GET /api/tasks - Get all tasks for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || "default-user"
    
    // Get or create user
    let user
    if (userId === "default-user") {
      user = await User.findOne({ email: "demo@example.com" })
      if (!user) {
        user = new User({
          email: "demo@example.com",
          passwordHash: "demo-hash",
          name: "Demo User",
          themePreference: "light"
        })
        await user.save()
      }
    } else {
      user = await User.findById(userId)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
    }

    const tasks = await Task.find({ userId: user._id }).sort({ createdAt: -1 })
    
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
    
    const { title, description, priority, category, eisenhowerCategory, duration, userId } = await request.json()
    
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Get or create user
    let user
    if (!userId || userId === "default-user") {
      user = await User.findOne({ email: "demo@example.com" })
      if (!user) {
        user = new User({
          email: "demo@example.com",
          passwordHash: "demo-hash",
          name: "Demo User",
          themePreference: "light"
        })
        await user.save()
      }
    } else {
      user = await User.findById(userId)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
    }

    const task = new Task({
      userId: user._id,
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
