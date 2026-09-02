/** Estado de carga a página completa, consistente en toda la app. */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-[var(--fs-base)] text-[var(--color-text-secondary)]">
      {label}
    </div>
  )
}
