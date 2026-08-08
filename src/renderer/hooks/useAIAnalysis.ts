import { useState, useEffect, useCallback, useRef } from 'react'
import type { AppSettings, Category, SpendingAnalysis, Transaction } from '../types'
import { fileManager } from '../utils/fileManager'
import { generateId } from '../utils/formatters'
import { buildSpendingSummary, summaryToPrompt, buildAnalysisSystemPrompt } from '../utils/aiAnalysis'
import { askAI } from '../utils/aiClient'

interface UseAIAnalysisArgs {
  transactions: Transaction[]
  categories: Category[]
  settings: AppSettings
  getLast6Months: () => string[]
  getMonthKey: (iso: string) => string
  getMonthLabel: (monthKey: string) => string
  currentMonthKey: () => string
}

export function useAIAnalysis({
  transactions, categories, settings,
  getLast6Months, getMonthKey, getMonthLabel, currentMonthKey,
}: UseAIAnalysisArgs) {
  const [analyses, setAnalyses] = useState<SpendingAnalysis[]>([])
  const [loading, setLoading]   = useState(true)
  const [hasKey, setHasKey]     = useState(false)
  const [running, setRunning]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const autoChecked = useRef(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, key] = await Promise.all([fileManager.readAnalyses(), fileManager.aiHasKey()])
      setAnalyses(data)
      setHasKey(key)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const runAnalysis = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setRunning(true)
    setError(null)
    try {
      const summary = buildSpendingSummary(
        transactions, categories, settings.currencySymbol,
        getLast6Months(), getMonthKey, getMonthLabel
      )
      const content = await askAI(settings, 'monthly-analysis', buildAnalysisSystemPrompt(settings), summaryToPrompt(summary))
      const entry: SpendingAnalysis = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        monthKey: currentMonthKey(),
        content,
        provider: settings.aiProvider!,
        model: settings.aiModel!,
      }
      const updated = [entry, ...analyses]
      setAnalyses(updated)
      await fileManager.writeAnalyses(updated)
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
      return { ok: false, error: msg }
    } finally {
      setRunning(false)
    }
  }, [settings, transactions, categories, analyses, getLast6Months, getMonthKey, getMonthLabel, currentMonthKey])

  // Auto-monthly: once loaded, if enabled and this month has no analysis
  // yet, run one quietly in the background — checked once per app session.
  useEffect(() => {
    if (loading || autoChecked.current) return
    autoChecked.current = true
    if (!settings.aiAutoMonthly || !hasKey) return
    if (analyses.some(a => a.monthKey === currentMonthKey())) return
    runAnalysis()
    // Deliberately runs once per session — depending on `runAnalysis` (which
    // changes with every new analysis) would re-trigger the check loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasKey, settings.aiAutoMonthly])

  const saveKey = useCallback(async (key: string) => {
    await fileManager.aiSaveKey(key)
    setHasKey(true)
  }, [])

  const clearKey = useCallback(async () => {
    await fileManager.aiClearKey()
    setHasKey(false)
  }, [])

  const deleteAnalysis = useCallback(async (id: string) => {
    const updated = analyses.filter(a => a.id !== id)
    setAnalyses(updated)
    await fileManager.writeAnalyses(updated)
  }, [analyses])

  return { analyses, loading, hasKey, running, error, runAnalysis, saveKey, clearKey, deleteAnalysis }
}

export type UseAIAnalysisReturn = ReturnType<typeof useAIAnalysis>
