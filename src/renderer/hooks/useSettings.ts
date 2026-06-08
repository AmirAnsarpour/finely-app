import { useState, useEffect, useCallback, useRef } from 'react'
import type { AppSettings } from '../types'
import { fileManager } from '../utils/fileManager'
import { DEFAULT_SETTINGS } from '../utils/defaults'

export function useSettings() {
  const [settings, setSettings]     = useState<AppSettings>(DEFAULT_SETTINGS)
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
      const [settingsData, dataFolder] = await Promise.all([
        fileManager.readSettings(),
        fileManager.getDataFolder(),
      ])
      const resolved: AppSettings = settingsData
        ? {
            ...DEFAULT_SETTINGS,
            ...settingsData,
            investmentCurrency: settingsData.investmentCurrency
              ?? (settingsData.currency === 'IRT' ? 'IRT' : 'USDT'),
            dataFolder,
          }
        : { ...DEFAULT_SETTINGS, dataFolder }
      setSettings(resolved)
      if (!settingsData) await fileManager.writeSettings(resolved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      initialized.current = true
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const updateSettings = useCallback(async (changes: Partial<AppSettings>) => {
    const updated = { ...settings, ...changes }
    setSettings(updated)
    await fileManager.writeSettings(updated)
    if (changes.dataFolder) await fileManager.setDataFolder(changes.dataFolder)
  }, [settings])

  return { settings, loading, refreshing, error, loadData, updateSettings }
}
