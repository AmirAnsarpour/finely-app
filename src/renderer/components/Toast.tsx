import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  }
  const COLORS = {
    success: 'var(--income)',
    error: 'var(--expense)',
    info: 'var(--accent)'
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div key={t.id} className="toast toast-enter" style={{ borderColor: COLORS[t.type] + '55' }}>
              <Icon size={16} color={COLORS[t.type]} />
              <span className="toast-msg">{t.message}</span>
              <button className="toast-dismiss" onClick={() => dismiss(t.id)}>
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
