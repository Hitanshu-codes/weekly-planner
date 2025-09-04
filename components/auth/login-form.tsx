"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoginFormProps {
    onLogin: (email: string, password: string) => Promise<void>
    onSwitchToRegister: () => void
    loading: boolean
    error?: string
}

export function LoginForm({ onLogin, onSwitchToRegister, loading, error }: LoginFormProps) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) return
        await onLogin(email, password)
    }

    return (
        <Card className="w-full max-w-md mx-auto premium-card glow-border light-shadow animate-scale-in">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome Back
                </CardTitle>
                <p className="text-muted-foreground">Sign in to your account</p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive" className="animate-slide-up">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="focus-ring premium-card"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="focus-ring premium-card"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full btn-premium focus-ring"
                        disabled={loading || !email || !password}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn className="mr-2 h-4 w-4" />
                                Sign In
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <button
                            type="button"
                            onClick={onSwitchToRegister}
                            className="text-primary hover:underline font-medium focus-ring"
                            disabled={loading}
                        >
                            Sign up
                        </button>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}


