// Paleta común para elegir el color de una categoría y para pintar las
// porciones de una gráfica cuando la entidad no trae color propio (las
// cuentas, por ejemplo). Se recorre en orden y se repite si hace falta.
export const COLOR_OPTIONS = ['#7C3AED', '#FF9500', '#34C759', '#007AFF', '#FF3B30', '#5856D6', '#32ADE6', '#FF2D55', '#8E8E93', '#AF52DE']

export function colorAt(index: number): string {
  return COLOR_OPTIONS[index % COLOR_OPTIONS.length]
}
