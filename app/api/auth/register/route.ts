import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/mongodb"
import { User } from "@/lib/models"

export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json()

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Name, email, and password are required" },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters long" },
                { status: 400 }
            )
        }

        // Connect to database
        await connectDB()

        // Check if user already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 409 }
            )
        }

        // Hash password
        const saltRounds = 12
        const passwordHash = await bcrypt.hash(password, saltRounds)

        // Create user
        const user = new User({
            name,
            email,
            passwordHash,
            themePreference: 'light'
        })

        const savedUser = await user.save()

        // Generate JWT token
        const token = jwt.sign(
            { userId: savedUser._id, email: savedUser.email },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        )

        // Return user data (without password hash) and token
        const userData = {
            _id: savedUser._id,
            email: savedUser.email,
            name: savedUser.name,
            themePreference: savedUser.themePreference
        }

        return NextResponse.json({
            user: userData,
            token
        }, { status: 201 })

    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}




