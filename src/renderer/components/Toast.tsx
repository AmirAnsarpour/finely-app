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
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 200;
          pointer-events: none;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          background: rgba(10, 15, 30, 0.96);
          backdrop-filter: blur(24px);
          border: 1px solid transparent;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          pointer-events: all;
          min-width: 240px;
          max-width: 380px;
        }
        [data-theme='light'] .toast {
          background: rgba(255,255,255,0.96);
        }
        .toast-msg {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .toast-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition);
        }
        .toast-dismiss:hover { color: var(--text-primary); }
      `}</style>
    </ToastContext.Provider>
  )
}
