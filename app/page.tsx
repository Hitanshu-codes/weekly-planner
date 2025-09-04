import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth/auth-provider"
import { AppContent } from "@/components/app-content"

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <main className="min-h-screen bg-background">
          <AppContent />
        </main>
      </AuthProvider>
    </ThemeProvider>
  )
}
