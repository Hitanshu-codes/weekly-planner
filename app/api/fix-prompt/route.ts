import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
    try {
        console.log("[API] Starting prompt fixing request")

        // Get user from JWT token
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as any

        const { originalPrompt } = await request.json()
        console.log("[API] Received original prompt:", originalPrompt, "userId:", decoded.userId)

        if (!originalPrompt) {
            console.log("[API] Error: No prompt provided")
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
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

        console.log("[API] Gemini API key found, proceeding with prompt fixing")

        const fixPrompt = `You are an expert prompt engineer. I need you to improve and fix this prompt for generating a weekly schedule. The prompt should be clear, specific, and optimized for generating a well-structured weekly schedule.

Original prompt: "${originalPrompt}"

Please provide an improved version of this prompt that:
1. Is more specific and actionable
2. Includes clear instructions for task categorization using the Eisenhower Matrix
3. Specifies the desired output format (JSON structure)
4. Includes guidelines for realistic time allocation
5. Considers work-life balance
6. Is optimized for AI schedule generation

Return ONLY the improved prompt text, no additional explanations or formatting.`

        console.log("[API] Sending prompt fix request to Gemini API")

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
                            parts: [{ text: fixPrompt }],
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

        const fixedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text
        console.log("[API] Extracted fixed prompt:", fixedPrompt)

        if (!fixedPrompt) {
            console.error("[API] No fixed prompt generated from Gemini API")
            throw new Error("No fixed prompt generated from Gemini API")
        }

        // Clean the response to extract just the prompt text
        let cleanedPrompt = fixedPrompt.trim()

        // Remove any markdown formatting or extra text
        if (cleanedPrompt.startsWith('```')) {
            const lines = cleanedPrompt.split('\n')
            const startIndex = lines.findIndex(line => line.trim().startsWith('```'))
            const endIndex = lines.findIndex((line, index) => index > startIndex && line.trim().startsWith('```'))

            if (startIndex !== -1 && endIndex !== -1) {
                cleanedPrompt = lines.slice(startIndex + 1, endIndex).join('\n').trim()
            }
        }

        console.log("[API] Final cleaned prompt:", cleanedPrompt)

        return NextResponse.json({
            originalPrompt,
            fixedPrompt: cleanedPrompt,
            improved: true,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error("[API] Error fixing prompt:", error)
        return NextResponse.json(
            {
                error: "Failed to fix prompt. Please try again.",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}

