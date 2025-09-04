"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EisenhowerMatrix } from "@/components/eisenhower-matrix"
import { WeeklySchedule } from "@/components/weekly-schedule"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth/auth-provider"
import { Calendar, Target, Sparkles, LogOut, User } from "lucide-react"

export function WeeklyPlanner() {
  const [weeklyGoals, setWeeklyGoals] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSchedule, setGeneratedSchedule] = useState(null)
  const [activeTab, setActiveTab] = useState("matrix")
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [pendingScheduleData, setPendingScheduleData] = useState<{ goals: string, existingScheduleId: string } | null>(null)
  const { user, logout } = useAuth()

  const generateSchedule = async () => {
    if (!weeklyGoals.trim()) return

    console.log("[WeeklyPlanner] Starting schedule generation with goals:", weeklyGoals)
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          goals: weeklyGoals,
          userId: user?._id
        }),
      })

      console.log("[WeeklyPlanner] API response status:", response.status)
      console.log("[WeeklyPlanner] API response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[WeeklyPlanner] API error response:", errorText)
        throw new Error(`Failed to generate schedule: ${response.status} - ${errorText}`)
      }

      const schedule = await response.json()
      console.log("[WeeklyPlanner] Received schedule data:", schedule)

      // Check if this is a warning about existing schedule
      if (schedule.hasExistingSchedule) {
        console.log("[WeeklyPlanner] Existing schedule detected, showing confirmation dialog")
        setPendingScheduleData({ goals: weeklyGoals, existingScheduleId: schedule.existingScheduleId })
        setShowReplaceDialog(true)
        return
      }

      setGeneratedSchedule(schedule)
      setActiveTab("schedule")
      console.log("[WeeklyPlanner] Schedule generated successfully, switching to schedule tab")
    } catch (error) {
      console.error("[WeeklyPlanner] Error generating schedule:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const confirmReplaceSchedule = async () => {
    if (!pendingScheduleData) return

    console.log("[WeeklyPlanner] Confirming schedule replacement")
    setIsGenerating(true)
    setShowReplaceDialog(false)

    try {
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          goals: pendingScheduleData.goals,
          userId: user?._id,
          replaceExisting: true,
          existingScheduleId: pendingScheduleData.existingScheduleId
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[WeeklyPlanner] API error response:", errorText)
        throw new Error(`Failed to replace schedule: ${response.status} - ${errorText}`)
      }

      const schedule = await response.json()
      console.log("[WeeklyPlanner] Schedule replaced successfully:", schedule)

      setGeneratedSchedule(schedule)
      setActiveTab("schedule")
      setPendingScheduleData(null)
    } catch (error) {
      console.error("[WeeklyPlanner] Error replacing schedule:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const cancelReplaceSchedule = () => {
    setShowReplaceDialog(false)
    setPendingScheduleData(null)
    setIsGenerating(false)
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8 animate-slide-up">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-xl premium-card glow-border animate-glow-pulse flex-shrink-0">
            <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-balance gradient-text">AI Weekly Planner</h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Let AI organize your perfect week</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-primary/10 border border-primary/20">
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">{user?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-1 sm:gap-2 btn-premium focus-ring text-xs sm:text-sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* AI Schedule Generator */}
      <Card className="mb-6 sm:mb-8 premium-card glow-border-strong light-shadow-lg animate-scale-in">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Weekly Goals & AI Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="space-y-3">
            <Textarea
              placeholder="Describe your goals and plans for this week... (e.g., 'I want to focus on my fitness routine, complete the marketing project, spend quality time with family, and learn React')"
              value={weeklyGoals}
              onChange={(e) => setWeeklyGoals(e.target.value)}
              className="min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base leading-relaxed focus-ring premium-card"
            />
            <div className="flex justify-end">
              <Button
                onClick={generateSchedule}
                disabled={!weeklyGoals.trim() || isGenerating}
                className="btn-premium text-sm sm:text-base px-6 sm:px-8 py-2 sm:py-3 h-auto min-w-[160px] sm:min-w-[200px]"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3" />
                    <span className="hidden sm:inline">Generating...</span>
                    <span className="sm:hidden">Generating</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    <span className="hidden sm:inline">Generate AI Schedule</span>
                    <span className="sm:hidden">Generate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="matrix" value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
        <TabsList className="grid w-full grid-cols-2 premium-card glow-border h-12 sm:h-14">
          <TabsTrigger value="matrix" className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base h-10 sm:h-12 focus-ring">
            <Target className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Priority Matrix</span>
            <span className="sm:hidden">Matrix</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base h-10 sm:h-12 focus-ring">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Weekly Schedule</span>
            <span className="sm:hidden">Schedule</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="animate-fade-in">
          <EisenhowerMatrix schedule={generatedSchedule} />
        </TabsContent>

        <TabsContent value="schedule" className="animate-fade-in">
          <WeeklySchedule schedule={generatedSchedule} />
        </TabsContent>
      </Tabs>

      {/* Replace Schedule Confirmation Dialog */}
      {showReplaceDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <Card className="w-full max-w-md premium-card glow-border-strong">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl text-orange-600 dark:text-orange-400">
                <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                Replace Existing Schedule?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                A schedule already exists for this week. Replacing it will remove all current tasks and time slots.
              </p>
              <p className="text-sm font-medium">
                Are you sure you want to continue?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={cancelReplaceSchedule}
                  disabled={isGenerating}
                  className="btn-premium text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmReplaceSchedule}
                  disabled={isGenerating}
                  className="btn-premium bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base"
                >
                  {isGenerating ? "Replacing..." : "Replace Schedule"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
