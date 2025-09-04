import mongoose, { Schema, Document } from 'mongoose'

// Eisenhower Matrix categories
export type EisenhowerCategory = 'urgent-important' | 'urgent-not-important' | 'not-urgent-important' | 'not-urgent-not-important'

// Task priority levels
export type TaskPriority = 'high' | 'medium' | 'low'

// Task categories
export type TaskCategory = 'Work' | 'Health' | 'Personal' | 'Learning' | 'Family' | 'Break' | 'Education' | 'College' | 'Fitness' | 'Social' | 'Finance' | 'Hobby' | 'Travel' | 'Shopping' | 'Maintenance' | 'General'

// Task interface
export interface ITask extends Document {
    id: string
    title: string
    description: string
    priority: TaskPriority
    category: TaskCategory
    eisenhowerCategory: EisenhowerCategory
    completed: boolean
    duration: number // in hours
    createdAt: Date
    updatedAt: Date
}

// Time slot interface
export interface ITimeSlot extends Document {
    id: string
    day: string
    startHour: number
    endHour: number
    task?: ITask
    merged: boolean
    createdAt: Date
    updatedAt: Date
}

// Weekly schedule interface
export interface IWeeklySchedule extends Document {
    id: string
    userId: string
    weekStartDate: Date
    goals: string
    timeSlots: ITimeSlot[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// History entry interface
export interface IHistoryEntry extends Document {
    id: string
    userId: string
    scheduleId: string
    action: 'create' | 'update' | 'delete' | 'move' | 'complete' | 'merge' | 'categorize'
    entityType: 'task' | 'timeSlot' | 'matrixTask'
    entityId: string
    details: {
        from?: any
        to?: any
        description: string
    }
    timestamp: Date
}

// Task Schema
const TaskSchema = new Schema<ITask>({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['Work', 'Health', 'Personal', 'Learning', 'Family', 'Break', 'Education', 'College', 'Fitness', 'Social', 'Finance', 'Hobby', 'Travel', 'Shopping', 'Maintenance', 'General'],
        default: 'Personal'
    },
    eisenhowerCategory: {
        type: String,
        enum: ['urgent-important', 'urgent-not-important', 'not-urgent-important', 'not-urgent-not-important'],
        default: 'not-urgent-not-important'
    },
    completed: { type: Boolean, default: false },
    duration: { type: Number, default: 1 },
}, {
    timestamps: true
})

// TimeSlot Schema
const TimeSlotSchema = new Schema<ITimeSlot>({
    id: { type: String, required: true },
    day: { type: String, required: true },
    startHour: { type: Number, required: true },
    endHour: { type: Number, required: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task' },
    merged: { type: Boolean, default: false },
}, {
    timestamps: true
})

// WeeklySchedule Schema
const WeeklyScheduleSchema = new Schema<IWeeklySchedule>({
    userId: { type: String, required: true },
    weekStartDate: { type: Date, required: true },
    goals: { type: String, required: true },
    timeSlots: [{ type: Schema.Types.ObjectId, ref: 'TimeSlot' }],
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true
})

// HistoryEntry Schema
const HistoryEntrySchema = new Schema<IHistoryEntry>({
    userId: { type: String, required: true },
    scheduleId: { type: String, required: true },
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'move', 'complete', 'merge', 'categorize'],
        required: true
    },
    entityType: {
        type: String,
        enum: ['task', 'timeSlot', 'matrixTask'],
        required: true
    },
    entityId: { type: String, required: true },
    details: {
        from: Schema.Types.Mixed,
        to: Schema.Types.Mixed,
        description: { type: String, required: true }
    },
    timestamp: { type: Date, default: Date.now }
})

// Create models
export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema)
export const TimeSlot = mongoose.models.TimeSlot || mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema)
export const WeeklySchedule = mongoose.models.WeeklySchedule || mongoose.model<IWeeklySchedule>('WeeklySchedule', WeeklyScheduleSchema)
export const HistoryEntry = mongoose.models.HistoryEntry || mongoose.model<IHistoryEntry>('HistoryEntry', HistoryEntrySchema)
