import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { TimeSlot, User } from "@/lib/models"

// GET /api/time-slots - Get all time slots for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || "default-user"
    const weekStart = searchParams.get('weekStart')
    
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

    let query: any = { userId: user._id }
    
    // Filter by week if weekStart is provided
    if (weekStart) {
      const startDate = new Date(weekStart)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)
      
      query.day = {
        $gte: startDate,
        $lt: endDate
      }
    }

    const timeSlots = await TimeSlot.find(query)
      .populate('task')
      .sort({ day: 1, startTime: 1 })
    
    return NextResponse.json(timeSlots)
  } catch (error) {
    console.error("[API] Error fetching time slots:", error)
    return NextResponse.json(
      { error: "Failed to fetch time slots" },
      { status: 500 }
    )
  }
}

// POST /api/time-slots - Create a new time slot
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { day, startTime, endTime, taskId, userId } = await request.json()
    
    if (!day || !startTime || !endTime) {
      return NextResponse.json({ 
        error: "Day, startTime, and endTime are required" 
      }, { status: 400 })
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

    const timeSlot = new TimeSlot({
      userId: user._id,
      day: new Date(day),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      task: taskId || undefined,
      merged: false,
    })

    const savedTimeSlot = await timeSlot.save()
    await savedTimeSlot.populate('task')
    
    return NextResponse.json(savedTimeSlot, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating time slot:", error)
    return NextResponse.json(
      { error: "Failed to create time slot" },
      { status: 500 }
    )
  }
}
