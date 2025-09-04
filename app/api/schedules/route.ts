import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { WeeklySchedule, User } from "@/lib/models"

// GET /api/schedules - Get all schedules for a user
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

    const schedules = await WeeklySchedule.find({ userId: user._id })
      .populate('timeSlots')
      .sort({ weekStartDate: -1 })
    
    return NextResponse.json(schedules)
  } catch (error) {
    console.error("[API] Error fetching schedules:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    )
  }
}

// POST /api/schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { weekStartDate, goals, timeSlotIds, userId } = await request.json()
    
    if (!weekStartDate || !goals) {
      return NextResponse.json({ 
        error: "Week start date and goals are required" 
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

    const schedule = new WeeklySchedule({
      userId: user._id,
      weekStartDate: new Date(weekStartDate),
      goals,
      timeSlots: timeSlotIds || [],
      isActive: true,
    })

    const savedSchedule = await schedule.save()
    await savedSchedule.populate('timeSlots')
    
    return NextResponse.json(savedSchedule, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating schedule:", error)
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    )
  }
}
