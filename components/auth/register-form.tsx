"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface RegisterFormProps {
    onRegister: (name: string, email: string, password: string) => Promise<void>
    onSwitchToLogin: () => void
    loading: boolean
    error?: string
}

export function RegisterForm({ onRegister, onSwitchToLogin, loading, error }: RegisterFormProps) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !email || !password || !confirmPassword) return
        if (password !== confirmPassword) return
        await onRegister(name, email, password)
    }

    const passwordsMatch = password === confirmPassword
    const isFormValid = name && email && password && confirmPassword && passwordsMatch

    return (
        <Card className="w-full max-w-md mx-auto premium-card glow-border light-shadow animate-scale-in">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                    Create Account
                </CardTitle>
                <p className="text-muted-foreground">Sign up to get started</p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive" className="animate-slide-up">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                            className="focus-ring premium-card"
                            required
                        />
                    </div>

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
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="focus-ring premium-card"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            className={cn(
                                "focus-ring premium-card",
                                confirmPassword && !passwordsMatch && "border-red-500"
                            )}
                            required
                        />
                        {confirmPassword && !passwordsMatch && (
                            <p className="text-sm text-red-500">Passwords do not match</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full btn-premium focus-ring"
                        disabled={loading || !isFormValid}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            <>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Create Account
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <button
                            type="button"
                            onClick={onSwitchToLogin}
                            className="text-primary hover:underline font-medium focus-ring"
                            disabled={loading}
                        >
                            Sign in
                        </button>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}










