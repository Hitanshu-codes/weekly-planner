import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { TimeSlot } from "@/lib/models"

// GET /api/time-slots/[id] - Get a specific time slot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const timeSlot = await TimeSlot.findById(params.id).populate('task')
    if (!timeSlot) {
      return NextResponse.json({ error: "Time slot not found" }, { status: 404 })
    }
    
    return NextResponse.json(timeSlot)
  } catch (error) {
    console.error("[API] Error fetching time slot:", error)
    return NextResponse.json(
      { error: "Failed to fetch time slot" },
      { status: 500 }
    )
  }
}

// PUT /api/time-slots/[id] - Update a time slot
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const updates = await request.json()
    
    // Convert date strings to Date objects if they exist
    if (updates.day) updates.day = new Date(updates.day)
    if (updates.startTime) updates.startTime = new Date(updates.startTime)
    if (updates.endTime) updates.endTime = new Date(updates.endTime)
    
    const timeSlot = await TimeSlot.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('task')
    
    if (!timeSlot) {
      return NextResponse.json({ error: "Time slot not found" }, { status: 404 })
    }
    
    return NextResponse.json(timeSlot)
  } catch (error) {
    console.error("[API] Error updating time slot:", error)
    return NextResponse.json(
      { error: "Failed to update time slot" },
      { status: 500 }
    )
  }
}

// DELETE /api/time-slots/[id] - Delete a time slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const timeSlot = await TimeSlot.findByIdAndDelete(params.id)
    if (!timeSlot) {
      return NextResponse.json({ error: "Time slot not found" }, { status: 404 })
    }
    
    return NextResponse.json({ message: "Time slot deleted successfully" })
  } catch (error) {
    console.error("[API] Error deleting time slot:", error)
    return NextResponse.json(
      { error: "Failed to delete time slot" },
      { status: 500 }
    )
  }
}
