import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { TimeSlot, User } from "@/lib/models"
import jwt from "jsonwebtoken"

// GET /api/time-slots - Get all time slots for a user
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

    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')

    let query: any = { userId: decoded.userId }

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

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as any

    const { day, startTime, endTime, taskId } = await request.json()

    if (!day || !startTime || !endTime) {
      return NextResponse.json({
        error: "Day, startTime, and endTime are required"
      }, { status: 400 })
    }

    const timeSlot = new TimeSlot({
      userId: decoded.userId,
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
