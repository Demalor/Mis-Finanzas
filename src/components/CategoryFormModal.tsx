import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Field, TextInput, TypeToggle } from './FormControls'
import type { Category, MovementType } from '../types/models'

const ICON_OPTIONS = ['🍽️', '🏠', '🚌', '💡', '🩺', '📚', '🎬', '🛍️', '💳', '📦', '💼', '🏦', '🧰', '📈', '🎁', '🐾', '✈️', '🎓']
const COLOR_OPTIONS = ['#7C3AED', '#FF9500', '#34C759', '#007AFF', '#FF3B30', '#5856D6', '#32ADE6', '#FF2D55', '#8E8E93', '#AF52DE']

export function CategoryFormModal({
  open,
  category,
  defaultType,
  onClose,
  onSave,
}: {
  open: boolean
  category?: Category
  defaultType: MovementType
  onClose: () => void
  onSave: (data: { name: string; type: MovementType; icon: string; color: string }) => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<MovementType>(category?.type ?? defaultType)
  const [icon, setIcon] = useState(category?.icon ?? ICON_OPTIONS[0])
  const [color, setColor] = useState(category?.color ?? COLOR_OPTIONS[0])

  // Reinicia el formulario cuando cambia la categoría a editar o se abre para crear
  const key = category?.id ?? 'new'

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Editar categoría' : 'Nueva categoría'}>
      <div key={key}>
        <Field label="Nombre">
          <TextInput
            value={name || category?.name || ''}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Mascotas"
            autoFocus
          />
        </Field>
        <Field label="Tipo">
          <TypeToggle value={type} onChange={setType} />
        </Field>
        <Field label="Icono">
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--fs-lg)] border-2 bg-[var(--color-muted)]"
                style={{ borderColor: icon === i ? 'var(--color-accent)' : 'transparent' }}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className="w-10 h-10 rounded-full border-2"
                style={{ background: c, borderColor: color === c ? 'var(--color-text)' : 'transparent' }}
              />
            ))}
          </div>
        </Field>
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            const finalName = name.trim() || category?.name || ''
            if (!finalName) return
            onSave({ name: finalName, type, icon, color })
            setName('')
          }}
        >
          Guardar categoría
        </Button>
      </div>
    </Modal>
  )
}
