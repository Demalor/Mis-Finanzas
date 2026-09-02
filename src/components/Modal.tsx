import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = '32rem' }: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-[var(--sp-4)]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] md:rounded-[var(--radius-xl)] shadow-2xl max-h-[88dvh] overflow-y-auto animate-[modalIn_0.18s_ease-out]"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 bg-[var(--color-surface)] flex items-center justify-between gap-[var(--sp-3)] px-[var(--sp-5)] py-[var(--sp-4)] border-b border-[var(--color-border)] rounded-t-[var(--radius-xl)]">
          <h2 className="t-h2 truncate min-w-0">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-[var(--color-muted)] hover:brightness-95 text-[var(--fs-lg)] text-[var(--color-text-secondary)]"
          >
            ✕
          </button>
        </div>
        <div className="p-[var(--sp-5)] pb-[calc(var(--sp-5)+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}
