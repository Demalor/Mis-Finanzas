import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = '520px' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full bg-[var(--color-surface)] rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[92vh] overflow-y-auto animate-[modalIn_0.18s_ease-out]"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 bg-[var(--color-surface)] flex items-center justify-between gap-3 px-6 py-5 border-b border-[var(--color-border)] rounded-t-[28px]">
          <h2 className="text-[20px] font-bold truncate min-w-0">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--color-muted)] hover:bg-gray-200 text-[20px] text-[var(--color-text-secondary)]"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
