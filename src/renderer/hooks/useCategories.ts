import { useState, useEffect, useCallback, useRef } from 'react'
import type { Category } from '../types'
import { fileManager } from '../utils/fileManager'
import { DEFAULT_CATEGORIES } from '../utils/defaults'
import { generateId } from '../utils/formatters'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
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
      const data = await fileManager.readCategories()
      const resolved = data.length > 0 ? data : DEFAULT_CATEGORIES
      setCategories(resolved)
      if (data.length === 0) await fileManager.writeCategories(DEFAULT_CATEGORIES)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addCategory = useCallback(async (c: Omit<Category, 'id'>) => {
    const newCat: Category = { ...c, id: generateId() }
    const updated = [...categories, newCat]
    setCategories(updated)
    await fileManager.writeCategories(updated)
  }, [categories])

  const updateCategory = useCallback(async (id: string, changes: Partial<Category>) => {
    const updated = categories.map(c => c.id === id ? { ...c, ...changes } : c)
    setCategories(updated)
    await fileManager.writeCategories(updated)
  }, [categories])

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter(c => c.id !== id)
    setCategories(updated)
    await fileManager.writeCategories(updated)
  }, [categories])

  return { categories, loading, refreshing, error, loadData, addCategory, updateCategory, deleteCategory }
}
