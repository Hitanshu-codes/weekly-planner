import mongoose, { Schema, Document, Types } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

/* -----------------------------
   ENUMS & TYPES
------------------------------ */
export type EisenhowerCategory =
    | 'urgent-important'
    | 'urgent-not-important'
    | 'not-urgent-important'
    | 'not-urgent-not-important'

export type TaskPriority = 'high' | 'medium' | 'low'

export type TaskCategory =
    | 'Work'
    | 'Health'
    | 'Personal'
    | 'Learning'
    | 'Family'
    | 'Break'
    | 'Education'
    | 'College'
    | 'Fitness'
    | 'Social'
    | 'Finance'
    | 'Hobby'
    | 'Travel'
    | 'Shopping'
    | 'Maintenance'
    | 'General'

/* -----------------------------
   USER MODEL
------------------------------ */
export interface IUser extends Document {
    email: string
    passwordHash: string
    name: string
    themePreference: 'light' | 'dark'
    createdAt: Date
    updatedAt: Date
}

const UserSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true },
        themePreference: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light',
        },
    },
    { timestamps: true }
)

/* -----------------------------
   TASK MODEL
------------------------------ */
export interface ITask extends Document {
    uuid: string
    userId: Types.ObjectId
    title: string
    description: string
    priority: TaskPriority
    category: TaskCategory
    eisenhowerCategory: EisenhowerCategory
    completed: boolean
    duration: number
    scheduledDate: Date
    recurrence?: 'none' | 'daily' | 'weekly' | 'custom'
    tags?: string[]
    color?: string
    icon?: string
    createdAt: Date
    updatedAt: Date
}

const TaskSchema = new Schema<ITask>(
    {
        uuid: { type: String, default: uuidv4, unique: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'medium',
        },
        category: {
            type: String,
            enum: [
                'Work',
                'Health',
                'Personal',
                'Learning',
                'Family',
                'Break',
                'Education',
                'College',
                'Fitness',
                'Social',
                'Finance',
                'Hobby',
                'Travel',
                'Shopping',
                'Maintenance',
                'General',
            ],
            default: 'Personal',
        },
        eisenhowerCategory: {
            type: String,
            enum: [
                'urgent-important',
                'urgent-not-important',
                'not-urgent-important',
                'not-urgent-not-important',
            ],
            default: 'not-urgent-not-important',
        },
        completed: { type: Boolean, default: false },
        duration: { type: Number, default: 1 },
        scheduledDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        recurrence: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'custom'],
            default: 'none',
        },
        tags: [{ type: String }],
        color: { type: String },
        icon: { type: String },
    },
    { timestamps: true }
)

TaskSchema.index({ userId: 1, completed: 1 })
TaskSchema.index({ userId: 1, scheduledDate: 1 })

/* -----------------------------
   TIME SLOT MODEL
------------------------------ */
export interface ITimeSlot extends Document {
    userId: Types.ObjectId
    day: Date
    startTime: Date
    endTime: Date
    task?: Types.ObjectId
    merged: boolean
    createdAt: Date
    updatedAt: Date
}

const TimeSlotSchema = new Schema<ITimeSlot>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        day: { type: Date, required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        task: { type: Schema.Types.ObjectId, ref: 'Task' },
        merged: { type: Boolean, default: false },
    },
    { timestamps: true }
)

TimeSlotSchema.index({ day: 1, startTime: 1 })

/* -----------------------------
   WEEKLY SCHEDULE MODEL
------------------------------ */
export interface IWeeklySchedule extends Document {
    userId: Types.ObjectId
    weekStartDate: Date
    goals: string
    timeSlots: Types.ObjectId[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const WeeklyScheduleSchema = new Schema<IWeeklySchedule>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        weekStartDate: { type: Date, required: true },
        goals: { type: String, required: true },
        timeSlots: [{ type: Schema.Types.ObjectId, ref: 'TimeSlot' }],
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
)

WeeklyScheduleSchema.index({ userId: 1, weekStartDate: 1 })

/* -----------------------------
   HISTORY MODEL
------------------------------ */
export interface IHistoryEntry extends Document {
    userId: Types.ObjectId
    scheduleId: Types.ObjectId
    action:
    | 'create'
    | 'update'
    | 'delete'
    | 'move'
    | 'complete'
    | 'merge'
    | 'categorize'
    entityType: 'task' | 'timeSlot' | 'matrixTask'
    entityId: string
    details: {
        from?: { timeSlotId?: string; eisenhowerCategory?: string }
        to?: { timeSlotId?: string; eisenhowerCategory?: string }
        description: string
    }
    performedBy: Types.ObjectId
    timestamp: Date
}

const HistoryEntrySchema = new Schema<IHistoryEntry>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduleId: { type: Schema.Types.ObjectId, ref: 'WeeklySchedule', required: true },
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'move', 'complete', 'merge', 'categorize'],
        required: true,
    },
    entityType: {
        type: String,
        enum: ['task', 'timeSlot', 'matrixTask'],
        required: true,
    },
    entityId: { type: String, required: true },
    details: {
        from: { type: Schema.Types.Mixed },
        to: { type: Schema.Types.Mixed },
        description: { type: String, required: true },
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
})

HistoryEntrySchema.index({ userId: 1, scheduleId: 1 })

/* -----------------------------
   MODEL EXPORTS
------------------------------ */
// Clear existing models to ensure we use the new schema
delete mongoose.models.User
delete mongoose.models.Task
delete mongoose.models.TimeSlot
delete mongoose.models.WeeklySchedule
delete mongoose.models.HistoryEntry

export const User = mongoose.model<IUser>('User', UserSchema)

export const Task = mongoose.model<ITask>('Task', TaskSchema)

export const TimeSlot = mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema)

export const WeeklySchedule = mongoose.model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema)

export const HistoryEntry = mongoose.model<IHistoryEntry>('HistoryEntry', HistoryEntrySchema)
