import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Acción a la derecha (escritorio) / debajo del título (móvil). */
  action?: ReactNode
  /** Contenido extra bajo el título en móvil / a la derecha en escritorio
      (p. ej. el selector de mes). Va después de `action`. */
  aside?: ReactNode
}

/**
 * Cabecera de página unificada: título + subtítulo opcional + acción(es).
 * Apila en móvil, fila en `md`. Reemplaza los bloques de cabecera hechos a mano.
 */
export function PageHeader({ title, subtitle, action, aside }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-4)]">
      <div className="min-w-0">
        <h1 className="t-h1 truncate">{title}</h1>
        {subtitle && (
          <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mt-1">{subtitle}</p>
        )}
      </div>
      {(action || aside) && (
        <div className="flex flex-wrap items-center gap-[var(--sp-3)] md:shrink-0">
          {action}
          {aside}
        </div>
      )}
    </div>
  )
}
