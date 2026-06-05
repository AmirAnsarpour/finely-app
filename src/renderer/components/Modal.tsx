import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`)

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus first focusable element on open
  useEffect(() => {
    if (!open || !contentRef.current) return
    const first = contentRef.current.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  }, [open])

  // Focus trap — keep Tab inside the modal
  useEffect(() => {
    if (!open || !contentRef.current) return
    const el = contentRef.current
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) { e.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    el.addEventListener('keydown', trap)
    return () => el.removeEventListener('keydown', trap)
  }, [open])

  if (!open) return null

  return ReactDOM.createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId.current}
    >
      <div
        ref={contentRef}
        className="modal-content"
        style={{ width, maxWidth: 'calc(100vw - 40px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title" id={titleId.current}>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
