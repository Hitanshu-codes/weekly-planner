"use client"

import { useState, useEffect, useCallback } from "react"

export interface HistoryEntry {
  id: string
  timestamp: Date
  action: "create" | "update" | "delete" | "move" | "complete" | "merge"
  entityType: "task" | "timeSlot" | "matrixTask"
  entityId: string
  details: {
    from?: any
    to?: any
    description: string
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    console.log(`[usePersistentState] Loading ${key} from localStorage`)
    try {
      const item = window.localStorage.getItem(key)
      console.log(`[usePersistentState] Raw localStorage value for ${key}:`, item)
      if (item) {
        const parsed = JSON.parse(item)
        console.log(`[usePersistentState] Parsed value for ${key}:`, parsed)
        setState(parsed)
      } else {
        console.log(`[usePersistentState] No localStorage value found for ${key}, using initial value`)
      }
    } catch (error) {
      console.error(`[usePersistentState] Error loading ${key} from localStorage:`, error)
    } finally {
      console.log(`[usePersistentState] Setting isLoaded to true for ${key}`)
      setIsLoaded(true)
    }
  }, [key])

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      console.log(`[usePersistentState] Saving ${key} to localStorage:`, state)
      try {
        window.localStorage.setItem(key, JSON.stringify(state))
        console.log(`[usePersistentState] Successfully saved ${key} to localStorage`)
      } catch (error) {
        console.error(`[usePersistentState] Error saving ${key} to localStorage:`, error)
      }
    } else {
      console.log(`[usePersistentState] Not saving ${key} yet, isLoaded is false`)
    }
  }, [key, state, isLoaded])

  return [state, setState, isLoaded] as const
}

export function useHistory() {
  const [history, setHistory, isLoaded] = usePersistentState<HistoryEntry[]>("planner-history", [])

  const addHistoryEntry = useCallback(
    (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      }

      setHistory((prev) => [newEntry, ...prev].slice(0, 1000)) // Keep last 1000 entries
    },
    [setHistory],
  )

  const getHistoryByDate = useCallback(
    (date: Date) => {
      const dateStr = date.toDateString()
      return history.filter((entry) => entry.timestamp.toString().includes(dateStr))
    },
    [history],
  )

  const getHistoryByWeek = useCallback(
    (weekStart: Date) => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      return history.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        return entryDate >= weekStart && entryDate < weekEnd
      })
    },
    [history],
  )

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  return {
    history,
    addHistoryEntry,
    getHistoryByDate,
    getHistoryByWeek,
    clearHistory,
    isLoaded,
  }
}
