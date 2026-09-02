import type { Category } from '../types/models'

// Categorías iniciales razonables. El usuario puede crear, editar y eliminar
// cualquiera de ellas; no son obligatorias.
export const DEFAULT_CATEGORIES: Category[] = [
  // Gastos
  { id: 'cat-alimentacion', name: 'Alimentación', type: 'gasto', icon: '🍽️', color: '#FF9500', isDefault: true },
  { id: 'cat-vivienda', name: 'Vivienda', type: 'gasto', icon: '🏠', color: '#5856D6', isDefault: true },
  { id: 'cat-transporte', name: 'Transporte', type: 'gasto', icon: '🚌', color: '#007AFF', isDefault: true },
  { id: 'cat-servicios', name: 'Servicios', type: 'gasto', icon: '💡', color: '#32ADE6', isDefault: true },
  { id: 'cat-salud', name: 'Salud', type: 'gasto', icon: '🩺', color: '#FF3B30', isDefault: true },
  { id: 'cat-educacion', name: 'Educación', type: 'gasto', icon: '📚', color: '#34C759', isDefault: true },
  { id: 'cat-entretenimiento', name: 'Entretenimiento', type: 'gasto', icon: '🎬', color: '#AF52DE', isDefault: true },
  { id: 'cat-compras', name: 'Compras', type: 'gasto', icon: '🛍️', color: '#FF2D55', isDefault: true },
  { id: 'cat-deudas', name: 'Deudas', type: 'gasto', icon: '💳', color: '#8E8E93', isDefault: true },
  { id: 'cat-otros-gasto', name: 'Otros', type: 'gasto', icon: '📦', color: '#636366', isDefault: true },
  // Ingresos
  { id: 'cat-salario', name: 'Salario', type: 'ingreso', icon: '💼', color: '#34C759', isDefault: true },
  { id: 'cat-pension', name: 'Pensión', type: 'ingreso', icon: '🏦', color: '#30B0C7', isDefault: true },
  { id: 'cat-independiente', name: 'Trabajo independiente', type: 'ingreso', icon: '🧰', color: '#7C3AED', isDefault: true },
  { id: 'cat-inversiones', name: 'Inversiones', type: 'ingreso', icon: '📈', color: '#00C7BE', isDefault: true },
  { id: 'cat-otros-ingreso', name: 'Otros', type: 'ingreso', icon: '📦', color: '#8E8E93', isDefault: true },
]
