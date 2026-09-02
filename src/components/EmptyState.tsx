interface EmptyStateProps {
  icon?: string
  title: string
  message?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-[var(--sp-7)] px-[var(--sp-5)]">
      <div className="text-[var(--fs-3xl)] mb-[var(--sp-3)]">{icon}</div>
      <h3 className="text-[var(--fs-lg)] font-semibold mb-1">{title}</h3>
      {message && (
        <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] max-w-sm mb-[var(--sp-4)]">{message}</p>
      )}
      {action}
    </div>
  )
}
