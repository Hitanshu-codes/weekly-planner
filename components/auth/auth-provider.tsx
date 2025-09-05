"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface User {
    _id: string
    email: string
    name: string
    themePreference: 'light' | 'dark'
}

interface AuthContextType {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    register: (name: string, email: string, password: string) => Promise<void>
    logout: () => void
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check if user is logged in on app start
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('auth-token')
                if (token) {
                    const response = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })

                    if (response.ok) {
                        const userData = await response.json()
                        setUser(userData)
                    } else {
                        localStorage.removeItem('auth-token')
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error)
                localStorage.removeItem('auth-token')
            } finally {
                setLoading(false)
            }
        }

        checkAuth()
    }, [])

    const login = async (email: string, password: string) => {
        setLoading(true)
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Login failed')
            }

            localStorage.setItem('auth-token', data.token)
            setUser(data.user)
        } catch (error) {
            throw error
        } finally {
            setLoading(false)
        }
    }

    const register = async (name: string, email: string, password: string) => {
        setLoading(true)
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed')
            }

            localStorage.setItem('auth-token', data.token)
            setUser(data.user)
        } catch (error) {
            throw error
        } finally {
            setLoading(false)
        }
    }

    const logout = () => {
        localStorage.removeItem('auth-token')
        setUser(null)
    }

    const value = {
        user,
        login,
        register,
        logout,
        loading,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}





