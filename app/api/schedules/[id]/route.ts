import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { WeeklySchedule } from "@/lib/models"

// GET /api/schedules/[id] - Get a specific schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const schedule = await WeeklySchedule.findById(params.id)
      .populate({
        path: 'timeSlots',
        populate: {
          path: 'task'
        }
      })
    
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }
    
    return NextResponse.json(schedule)
  } catch (error) {
    console.error("[API] Error fetching schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    )
  }
}

// PUT /api/schedules/[id] - Update a schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const updates = await request.json()
    
    // Convert date strings to Date objects if they exist
    if (updates.weekStartDate) updates.weekStartDate = new Date(updates.weekStartDate)
    
    const schedule = await WeeklySchedule.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    ).populate({
      path: 'timeSlots',
      populate: {
        path: 'task'
      }
    })
    
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }
    
    return NextResponse.json(schedule)
  } catch (error) {
    console.error("[API] Error updating schedule:", error)
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    )
  }
}

// DELETE /api/schedules/[id] - Delete a schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const schedule = await WeeklySchedule.findByIdAndDelete(params.id)
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }
    
    return NextResponse.json({ message: "Schedule deleted successfully" })
  } catch (error) {
    console.error("[API] Error deleting schedule:", error)
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    )
  }
}
