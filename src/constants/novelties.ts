// Se incrementa cada vez que se agregan novedades que vale la pena anunciar.
// Cuando el perfil del usuario tiene un número menor guardado, se le muestra el modal de novedades.
export const CURRENT_NOVELTIES_VERSION = 2

export const NOVELTIES: { icon: string; title: string; description: string }[] = [
  {
    icon: '👛',
    title: 'Cuentas en varias monedas',
    description: 'Crea tus propias cuentas (efectivo, banco, tarjeta) en pesos, euros, dólares o francos suizos. El cambio de moneda entre cuentas también vive ahí.',
  },
  {
    icon: '💼',
    title: 'Fuentes de ingreso y presupuestos',
    description: 'Marca de dónde viene cada ingreso, y define límites mensuales por categoría desde "Organización".',
  },
  {
    icon: '💳',
    title: 'Tarjetas de crédito y préstamos',
    description: 'Lleva el control de cupos, fechas de pago, y lo que debes o te deben, con avisos antes de que venzan.',
  },
  {
    icon: '🌙',
    title: 'Modo oscuro',
    description: 'Actívalo desde el ícono en Inicio o desde Configuración.',
  },
  {
    icon: '🗂️',
    title: 'Menú reorganizado',
    description: 'Movimientos ahora incluye los recurrentes, y Resumen incluye la tabla tipo Excel — todo más junto y fácil de encontrar.',
  },
]
