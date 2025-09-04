import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Task, TimeSlot, WeeklySchedule, HistoryEntry, User, EisenhowerCategory } from "@/lib/models"
import { Types } from "mongoose"
import jwt from "jsonwebtoken"

// Helper function to get upcoming Sunday
function getUpcomingSunday(today: Date = new Date()): Date {
  const day = today.getDay() // 0 = Sunday, 6 = Saturday
  const diff = (7 - day) % 7 // days left until Sunday
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + diff)
  sunday.setHours(23, 59, 59, 999) // end of Sunday
  return sunday
}

// Helper function to get days to include in schedule (from today until Sunday)
function getDaysToSchedule(): string[] {
  const today = new Date()
  const currentDay = today.getDay() // 0 = Sunday, 6 = Saturday
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // If today is Sunday, include only Sunday
  if (currentDay === 0) {
    return ['Sunday']
  }

  // Otherwise, include from today until Sunday
  const daysToInclude = []
  for (let i = currentDay; i <= 6; i++) {
    daysToInclude.push(allDays[i])
  }

  return daysToInclude
}

export async function POST(request: NextRequest) {
  try {
    console.log("[API] Starting schedule generation request")

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as any

    const { goals } = await request.json()
    console.log("[API] Received goals:", goals, "userId:", decoded.userId)

    if (!goals) {
      console.log("[API] Error: No goals provided")
      return NextResponse.json({ error: "Goals are required" }, { status: 400 })
    }

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.log("[API] Error: No Gemini API key configured")
      return NextResponse.json(
        {
          error: "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.",
        },
        { status: 500 },
      )
    }

    console.log("[API] Gemini API key found, proceeding with request")

    // Get the days to include in the schedule
    const daysToSchedule = getDaysToSchedule()
    console.log("[API] Days to schedule:", daysToSchedule)

    const prompt = `Create a detailed schedule for the remaining days of this week based on these goals: "${goals}". 

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })} and you should only create tasks for: ${daysToSchedule.join(', ')}.

For each task, you must categorize it using the Eisenhower Matrix:
- "urgent-important": Critical tasks that need immediate attention (deadlines, emergencies, important meetings)
- "urgent-not-important": Tasks that feel urgent but aren't truly important (interruptions, some emails, non-critical requests)
- "not-urgent-important": Important tasks that aren't urgent (planning, skill development, relationship building, health)
- "not-urgent-not-important": Tasks that are neither urgent nor important (time wasters, excessive social media, busy work)

Return a JSON object with this exact structure (only include the days mentioned above):
{
  "Monday": {
    "8": {"title": "Morning Routine", "description": "Exercise and breakfast", "priority": "high", "category": "Health", "eisenhowerCategory": "not-urgent-important"},
    "9": {"title": "Work Block 1", "description": "Focus on main project", "priority": "high", "category": "Work", "eisenhowerCategory": "urgent-important"},
    "10": {"title": "Work Block 2", "description": "Meetings and emails", "priority": "medium", "category": "Work", "eisenhowerCategory": "urgent-not-important"}
  },
  "Tuesday": {
    "8": {"title": "Exercise", "description": "Fitness routine", "priority": "high", "category": "Health", "eisenhowerCategory": "not-urgent-important"},
    "10": {"title": "Learning", "description": "Skill development", "priority": "medium", "category": "Learning", "eisenhowerCategory": "not-urgent-important"}
  },
  "Wednesday": {
    "8": {"title": "Morning Routine", "description": "Start your day right", "priority": "high", "category": "Health", "eisenhowerCategory": "not-urgent-important"},
    "9": {"title": "Work Focus", "description": "Main project work", "priority": "high", "category": "Work", "eisenhowerCategory": "urgent-important"}
  },
  "Thursday": {
    "8": {"title": "Exercise", "description": "Fitness routine", "priority": "high", "category": "Health", "eisenhowerCategory": "not-urgent-important"},
    "10": {"title": "Learning", "description": "Skill development", "priority": "medium", "category": "Learning", "eisenhowerCategory": "not-urgent-important"}
  },
  "Friday": {
    "8": {"title": "Morning Routine", "description": "Start your day right", "priority": "high", "category": "Health", "eisenhowerCategory": "not-urgent-important"},
    "9": {"title": "Work Focus", "description": "Main project work", "priority": "high", "category": "Work", "eisenhowerCategory": "urgent-important"}
  },
  "Saturday": {
    "10": {"title": "Family Time", "description": "Spend quality time with family", "priority": "medium", "category": "Family", "eisenhowerCategory": "not-urgent-important"},
    "14": {"title": "Personal Project", "description": "Work on hobbies or personal interests", "priority": "low", "category": "Personal", "eisenhowerCategory": "not-urgent-not-important"}
  },
  "Sunday": {
    "10": {"title": "Rest and Planning", "description": "Plan for next week and rest", "priority": "medium", "category": "Personal", "eisenhowerCategory": "not-urgent-important"},
    "16": {"title": "Preparation", "description": "Prepare for the week ahead", "priority": "medium", "category": "Personal", "eisenhowerCategory": "not-urgent-important"}
  }
}

Guidelines:
- Use hours 8-22 (8am-10pm)
- Include realistic breaks and meals
- Balance work, personal, health, and learning activities
- Set appropriate priorities: "high", "medium", "low"
- Use categories like: "Work", "Health", "Personal", "Learning", "Family", "Break", "Education", "College", "Fitness", "Social", "Finance", "Hobby", "Travel", "Shopping", "Maintenance", "General"
- CRITICAL: Assign eisenhowerCategory to each task based on urgency and importance
- Make descriptions specific and actionable
- Consider the user's stated goals and preferences
- Return ONLY the JSON object, no additional text or markdown formatting
- Ensure the JSON is valid and properly formatted`

    console.log("[API] Sending prompt to Gemini API:", prompt)

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    )

    console.log("[API] Gemini API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[API] Gemini API error response:", errorText)
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("[API] Gemini API raw response:", JSON.stringify(data, null, 2))

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    console.log("[API] Extracted generated text:", generatedText)

    if (!generatedText) {
      console.error("[API] No content generated from Gemini API")
      throw new Error("No content generated from Gemini API")
    }

    let schedule: any
    try {
      // Clean the response to extract JSON
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      console.log("[API] JSON regex match result:", jsonMatch)

      if (jsonMatch) {
        try {
          schedule = JSON.parse(jsonMatch[0])
          console.log("[API] Successfully parsed JSON schedule:", schedule)

          // Validate the schedule structure
          if (typeof schedule === "object" && schedule !== null) {
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            const hasValidDays = days.some(day => schedule[day] && typeof schedule[day] === "object")

            if (!hasValidDays) {
              console.log("[API] Schedule doesn't have expected day structure, using fallback")
              throw new Error("Invalid schedule structure")
            }
          } else {
            throw new Error("Schedule is not an object")
          }
        } catch (parseError) {
          console.error("[API] JSON parsing or validation failed:", parseError)
          throw parseError
        }
      } else {
        console.log("[API] No JSON match found, creating sample schedule")
        throw new Error("No JSON content found")
      }
    } catch (parseError) {
      console.error("[API] Schedule creation failed, using fallback:", parseError)
      console.log("[API] Raw text that failed to parse:", generatedText)

      // Create a comprehensive fallback schedule (only for relevant days)
      const fallbackSchedule: any = {}

      // Define all possible day schedules
      const daySchedules = {
        Monday: {
          "8": {
            title: "Morning Routine",
            description: "Start your day right with exercise and breakfast",
            priority: "high",
            category: "Health",
            eisenhowerCategory: "not-urgent-important"
          },
          "9": {
            title: "Work Focus",
            description: "Main project work and planning",
            priority: "high",
            category: "Work",
            eisenhowerCategory: "urgent-important"
          },
          "12": {
            title: "Lunch Break",
            description: "Healthy meal and rest",
            priority: "medium",
            category: "Break",
            eisenhowerCategory: "not-urgent-important"
          },
          "14": {
            title: "Afternoon Work",
            description: "Continue with project tasks",
            priority: "high",
            category: "Work",
            eisenhowerCategory: "urgent-important"
          },
        },
        Tuesday: {
          "8": {
            title: "Exercise",
            description: "Fitness routine and stretching",
            priority: "high",
            category: "Health",
            eisenhowerCategory: "not-urgent-important"
          },
          "10": {
            title: "Learning",
            description: "Skill development and training",
            priority: "medium",
            category: "Learning",
            eisenhowerCategory: "not-urgent-important"
          },
          "13": {
            title: "Work Session",
            description: "Focus on important tasks",
            priority: "high",
            category: "Work",
            eisenhowerCategory: "urgent-important"
          },
        },
        Wednesday: {
          "8": {
            title: "Morning Routine",
            description: "Start your day with energy",
            priority: "high",
            category: "Health",
            eisenhowerCategory: "not-urgent-important"
          },
          "9": {
            title: "Team Meeting",
            description: "Collaborate with team members",
            priority: "medium",
            category: "Work",
            eisenhowerCategory: "urgent-not-important"
          },
          "11": {
            title: "Deep Work",
            description: "Focus on complex tasks",
            priority: "high",
            category: "Work",
            eisenhowerCategory: "urgent-important"
          },
        },
        Thursday: {
          "8": {
            title: "Exercise",
            description: "Cardio and strength training",
            priority: "high",
            category: "Health",
            eisenhowerCategory: "not-urgent-important"
          },
          "10": {
            title: "Learning",
            description: "Online course or reading",
            priority: "medium",
            category: "Learning",
            eisenhowerCategory: "not-urgent-important"
          },
          "14": {
            title: "Project Work",
            description: "Continue with ongoing projects",
            priority: "high",
            category: "Work",
            eisenhowerCategory: "urgent-important"
          },
        },
        Friday: {
          "8": {
            title: "Morning Routine",
            description: "Prepare for productive day",
            priority: "high",
            category: "Health",
            eisenhowerCategory: "not-urgent-important"
          },
          "9": {
            title: "Work Focus",
            description: "Complete weekly objectives",
            priority: "high",
            category: "Work",
            eisenhowerCategory: "urgent-important"
          },
          "16": {
            title: "Week Review",
            description: "Plan and organize for next week",
            priority: "medium",
            category: "Personal",
            eisenhowerCategory: "not-urgent-important"
          },
        },
        Saturday: {
          "10": {
            title: "Family Time",
            description: "Spend quality time with family",
            priority: "medium",
            category: "Family",
            eisenhowerCategory: "not-urgent-important"
          },
          "14": {
            title: "Personal Project",
            description: "Work on hobbies or interests",
            priority: "low",
            category: "Personal",
            eisenhowerCategory: "not-urgent-not-important"
          },
          "18": {
            title: "Relaxation",
            description: "Unwind and recharge",
            priority: "low",
            category: "Personal",
            eisenhowerCategory: "not-urgent-not-important"
          },
        },
        Sunday: {
          "10": {
            title: "Rest and Planning",
            description: "Plan for next week and rest",
            priority: "medium",
            category: "Personal",
            eisenhowerCategory: "not-urgent-important"
          },
          "16": {
            title: "Preparation",
            description: "Prepare for the week ahead",
            priority: "medium",
            category: "Personal",
            eisenhowerCategory: "not-urgent-important"
          },
          "20": {
            title: "Evening Routine",
            description: "Set up for successful week",
            priority: "low",
            category: "Personal",
            eisenhowerCategory: "not-urgent-not-important"
          },
        }
      }

      // Only include days that are in our schedule
      for (const day of daysToSchedule) {
        if (daySchedules[day as keyof typeof daySchedules]) {
          fallbackSchedule[day] = daySchedules[day as keyof typeof daySchedules]
        }
      }

      schedule = fallbackSchedule
    }

    console.log("[API] Final schedule being returned:", schedule)

    // Connect to MongoDB and save the schedule
    try {
      await connectDB()
      console.log("[API] Connected to MongoDB")

      // Get user from database
      const user = await User.findById(decoded.userId)
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const weekStartDate = new Date()
      weekStartDate.setHours(0, 0, 0, 0) // Start of the week

      // Create tasks and time slots
      const createdTasks = []
      const createdTimeSlots = []

      // Only process days that are in our schedule
      for (const [day, daySchedule] of Object.entries(schedule)) {
        // Skip days that are not in our daysToSchedule list
        if (!daysToSchedule.includes(day)) {
          console.log(`[API] Skipping ${day} as it's not in the current schedule period`)
          continue
        }
        for (const [hour, taskData] of Object.entries(daySchedule as any)) {
          if (taskData && typeof taskData === 'object') {
            const task = taskData as any // Type assertion for task data

            // Validate and normalize category
            const validCategories = ['Work', 'Health', 'Personal', 'Learning', 'Family', 'Break', 'Education', 'College', 'Fitness', 'Social', 'Finance', 'Hobby', 'Travel', 'Shopping', 'Maintenance', 'General']
            const normalizedCategory = validCategories.includes(task.category) ? task.category : "General"

            if (task.category && !validCategories.includes(task.category)) {
              console.log(`[API] Invalid category '${task.category}' normalized to 'General'`)
            }

            // Validate and normalize eisenhower category
            const validEisenhowerCategories = ['urgent-important', 'urgent-not-important', 'not-urgent-important', 'not-urgent-not-important']
            const normalizedEisenhowerCategory = validEisenhowerCategories.includes(task.eisenhowerCategory) ? task.eisenhowerCategory : "not-urgent-not-important"

            // Validate and normalize priority
            const validPriorities = ['high', 'medium', 'low']
            const normalizedPriority = validPriorities.includes(task.priority) ? task.priority : "medium"

            // Calculate the scheduled date for this task
            // Get the current date and find the actual calendar date for each day of the week
            const today = new Date()
            const currentDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

            // Map day names to day numbers (Monday = 1, Tuesday = 2, etc.)
            const dayNameToNumber = {
              'Monday': 1,
              'Tuesday': 2,
              'Wednesday': 3,
              'Thursday': 4,
              'Friday': 5,
              'Saturday': 6,
              'Sunday': 0
            }

            const targetDayNumber = dayNameToNumber[day as keyof typeof dayNameToNumber]

            // Calculate how many days to add to get to the target day
            let daysToAdd = targetDayNumber - currentDayOfWeek
            if (daysToAdd <= 0) {
              daysToAdd += 7 // If the day has passed this week, go to next week
            }

            const dayDate = new Date(today)
            dayDate.setDate(today.getDate() + daysToAdd)
            dayDate.setHours(parseInt(hour), 0, 0, 0)

            console.log(`[API] Creating task for ${day} ${hour}:00 - scheduledDate: ${dayDate.toISOString()}`)

            // Create task with new model structure
            const newTask = new Task({
              userId: user._id,
              title: task.title || "Generated Task",
              description: task.description || "",
              priority: normalizedPriority,
              category: normalizedCategory,
              eisenhowerCategory: normalizedEisenhowerCategory,
              completed: false,
              duration: task.duration || 1,
              scheduledDate: dayDate,
            })

            const savedTask = await newTask.save()
            createdTasks.push(savedTask)

            // Create time slot with new model structure
            const startTime = new Date(dayDate)
            const endTime = new Date(dayDate)
            endTime.setHours(parseInt(hour) + 1, 0, 0, 0)

            const timeSlot = new TimeSlot({
              userId: user._id,
              day: dayDate,
              startTime: startTime,
              endTime: endTime,
              task: savedTask._id,
              merged: false,
            })

            const savedTimeSlot = await timeSlot.save()
            createdTimeSlots.push(savedTimeSlot)
          }
        }
      }

      // Create weekly schedule
      const weeklySchedule = new WeeklySchedule({
        userId: user._id,
        weekStartDate: weekStartDate,
        goals: goals,
        timeSlots: createdTimeSlots.map(ts => ts._id),
        isActive: true,
      })

      const savedSchedule = await weeklySchedule.save()

      // Create history entry
      const historyEntry = new HistoryEntry({
        userId: user._id,
        scheduleId: savedSchedule._id as Types.ObjectId,
        action: "create",
        entityType: "task",
        entityId: (savedSchedule._id as Types.ObjectId).toString(),
        details: {
          description: `Created weekly schedule with ${createdTasks.length} tasks based on goals: ${goals}`,
          to: { scheduleId: savedSchedule._id as Types.ObjectId, taskCount: createdTasks.length }
        },
        performedBy: user._id
      })

      await historyEntry.save()

      console.log("[API] Schedule saved to MongoDB:", savedSchedule._id)

      // Return schedule with MongoDB IDs
      return NextResponse.json({
        ...schedule,
        _id: savedSchedule._id as Types.ObjectId,
        scheduleId: (savedSchedule._id as Types.ObjectId).toString(),
        taskCount: createdTasks.length,
        savedAt: new Date().toISOString()
      })

    } catch (dbError) {
      console.error("[API] MongoDB error:", dbError)
      // Return schedule even if DB save fails
      return NextResponse.json({
        ...schedule,
        error: "Schedule generated but not saved to database",
        dbError: dbError instanceof Error ? dbError.message : "Unknown database error"
      })
    }
  } catch (error) {
    console.error("[API] Error generating schedule:", error)
    return NextResponse.json(
      {
        error: "Failed to generate schedule. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
