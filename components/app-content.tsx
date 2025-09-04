"use client"

import { WeeklyPlanner } from "@/components/weekly-planner"
import { AuthModal } from "@/components/auth/auth-modal"
import { useAuth } from "@/components/auth/auth-provider"

export function AppContent() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <AuthModal />
    }

    return <WeeklyPlanner />
}


