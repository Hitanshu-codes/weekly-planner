import { WeeklyPlanner } from "@/components/weekly-planner"
import { ThemeProvider } from "@/components/theme-provider"

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-background">
        <WeeklyPlanner />
      </main>
    </ThemeProvider>
  )
}
