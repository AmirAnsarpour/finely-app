import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export default function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width, maxWidth: 'calc(100vw - 40px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          z-index: 100;
          overflow-y: auto;
          padding: 40px 20px;
        }
        .modal-content {
          background: rgba(8, 8, 10, 0.97);
          backdrop-filter: blur(40px) saturate(160%);
          -webkit-backdrop-filter: blur(40px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: var(--radius-xl);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1);
          overflow: hidden;
          margin: auto 0;
          flex-shrink: 0;
        }
        [data-theme='light'] .modal-content {
          background: rgba(245, 248, 255, 0.96);
          border-color: rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--glass-border);
        }
        .modal-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-xs);
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          transition: background var(--transition), color var(--transition);
        }
        .modal-close:hover {
          background: var(--expense-dim);
          color: var(--expense);
          border-color: rgba(248,113,113,0.3);
        }
        .modal-body {
          padding: 20px 24px 24px;
        }
      `}</style>
    </div>,
    document.body
  )
}
