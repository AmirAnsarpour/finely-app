import { useState, useEffect, useCallback, useRef } from 'react'
import type { Goal } from '../types'
import { fileManager } from '../utils/fileManager'
import { generateId } from '../utils/formatters'

export function useGoals() {
  const [goals, setGoals]           = useState<Goal[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const initialized = useRef(false)

  const loadData = useCallback(async () => {
    const isRefresh = initialized.current
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setGoals(await fileManager.readGoals())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addGoal = useCallback(async (g: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = { ...g, id: generateId(), createdAt: new Date().toISOString() }
    const updated = [...goals, newGoal]
    setGoals(updated)
    await fileManager.writeGoals(updated)
  }, [goals])

  const updateGoal = useCallback(async (id: string, changes: Partial<Goal>) => {
    const updated = goals.map(g => g.id === id ? { ...g, ...changes } : g)
    setGoals(updated)
    await fileManager.writeGoals(updated)
  }, [goals])

  const deleteGoal = useCallback(async (id: string) => {
    const updated = goals.filter(g => g.id !== id)
    setGoals(updated)
    await fileManager.writeGoals(updated)
  }, [goals])

  const logGoalContribution = useCallback(async (id: string, amount: number) => {
    const updated = goals.map(g =>
      g.id === id ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount) } : g
    )
    setGoals(updated)
    await fileManager.writeGoals(updated)
  }, [goals])

  return { goals, loading, refreshing, error, loadData, addGoal, updateGoal, deleteGoal, logGoalContribution }
}
