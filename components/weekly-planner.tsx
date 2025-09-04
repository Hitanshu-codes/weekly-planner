"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EisenhowerMatrix } from "@/components/eisenhower-matrix"
import { WeeklySchedule } from "@/components/weekly-schedule"
import { ThemeToggle } from "@/components/theme-toggle"
import { Calendar, Target, Sparkles } from "lucide-react"

export function WeeklyPlanner() {
  const [weeklyGoals, setWeeklyGoals] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSchedule, setGeneratedSchedule] = useState(null)
  const [activeTab, setActiveTab] = useState("matrix")

  const generateSchedule = async () => {
    if (!weeklyGoals.trim()) return

    console.log("[WeeklyPlanner] Starting schedule generation with goals:", weeklyGoals)
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: weeklyGoals }),
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

      setGeneratedSchedule(schedule)
      setActiveTab("schedule")
      console.log("[WeeklyPlanner] Schedule generated successfully, switching to schedule tab")
    } catch (error) {
      console.error("[WeeklyPlanner] Error generating schedule:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl premium-card glow-border animate-glow-pulse">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-balance gradient-text">AI Weekly Planner</h1>
            <p className="text-muted-foreground text-lg">Let AI organize your perfect week</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* AI Schedule Generator */}
      <Card className="mb-8 premium-card glow-border-strong light-shadow-lg animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Target className="h-6 w-6 text-primary" />
            Weekly Goals & AI Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Textarea
              placeholder="Describe your goals and plans for this week... (e.g., 'I want to focus on my fitness routine, complete the marketing project, spend quality time with family, and learn React')"
              value={weeklyGoals}
              onChange={(e) => setWeeklyGoals(e.target.value)}
              className="min-h-[120px] resize-none text-base leading-relaxed focus-ring premium-card"
            />
            <div className="flex justify-end">
              <Button
                onClick={generateSchedule}
                disabled={!weeklyGoals.trim() || isGenerating}
                className="btn-premium text-base px-8 py-3 h-auto min-w-[200px]"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-3" />
                    Generate AI Schedule
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="matrix" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 premium-card glow-border h-14">
          <TabsTrigger value="matrix" className="flex items-center gap-3 text-base h-12 focus-ring">
            <Target className="h-5 w-5" />
            Priority Matrix
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-3 text-base h-12 focus-ring">
            <Calendar className="h-5 w-5" />
            Weekly Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="animate-fade-in">
          <EisenhowerMatrix schedule={generatedSchedule} />
        </TabsContent>

        <TabsContent value="schedule" className="animate-fade-in">
          <WeeklySchedule schedule={generatedSchedule} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
