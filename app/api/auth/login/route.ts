import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/mongodb"
import { User } from "@/lib/models"

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            )
        }

        // Connect to database
        await connectDB()

        // Find user by email
        const user = await User.findOne({ email })
        if (!user) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            )
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            )
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '7d' }
        )

        // Return user data (without password hash) and token
        const userData = {
            _id: user._id,
            email: user.email,
            name: user.name,
            themePreference: user.themePreference
        }

        return NextResponse.json({
            user: userData,
            token
        })

    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}





