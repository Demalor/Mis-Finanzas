interface EmptyStateProps {
  icon?: string
  title: string
  message?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-[48px] mb-3">{icon}</div>
      <h3 className="text-[18px] font-semibold mb-1">{title}</h3>
      {message && <p className="text-[15px] text-[var(--color-text-secondary)] max-w-sm mb-4">{message}</p>}
      {action}
    </div>
  )
}
