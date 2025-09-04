"use client"

import { useState } from "react"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"
import { useAuth } from "./auth-provider"

export function AuthModal() {
    const [isLogin, setIsLogin] = useState(true)
    const [error, setError] = useState<string | undefined>()
    const { login, register, loading } = useAuth()

    const handleLogin = async (email: string, password: string) => {
        try {
            setError(undefined)
            await login(email, password)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        }
    }

    const handleRegister = async (name: string, email: string, password: string) => {
        try {
            setError(undefined)
            await register(name, email, password)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <div className="w-full max-w-md">
                {isLogin ? (
                    <LoginForm
                        onLogin={handleLogin}
                        onSwitchToRegister={() => setIsLogin(false)}
                        loading={loading}
                        error={error}
                    />
                ) : (
                    <RegisterForm
                        onRegister={handleRegister}
                        onSwitchToLogin={() => setIsLogin(true)}
                        loading={loading}
                        error={error}
                    />
                )}
            </div>
        </div>
    )
}




