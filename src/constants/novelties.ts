// Se incrementa cada vez que se agregan novedades que vale la pena anunciar.
// Cuando el perfil del usuario tiene un número menor guardado, se le muestra el modal de novedades.
export const CURRENT_NOVELTIES_VERSION = 3

export const NOVELTIES: { icon: string; title: string; description: string }[] = [
  // --- Novedades de esta versión ---
  {
    icon: '📱',
    title: 'Diseño renovado y adaptable',
    description:
      'La app se ve y se siente bien en celular, tablet y computador: los textos, las tarjetas y los espacios se ajustan solos al tamaño de tu pantalla.',
  },
  {
    icon: '🧭',
    title: 'Navegación más completa en el celular',
    description:
      'La barra de abajo tiene un botón "Más" que abre el resto de secciones: Cuentas, Préstamos, Organización y Configuración.',
  },
  {
    icon: '💱',
    title: 'Elige la moneda en Inicio y Resumen',
    description:
      'En Inicio puedes ver el total combinado en la moneda que prefieras, y en Resumen los gráficos ya no mezclan monedas: eliges cuál ver, con los números alineados.',
  },
  {
    icon: '🔁',
    title: 'Recurrentes con cuenta',
    description:
      'Al crear un movimiento recurrente (arriendo, salario…) ahora eliges a qué cuenta se carga, así queda en la moneda correcta.',
  },
  {
    icon: '⚡',
    title: 'Más rápida y con varios arreglos',
    description:
      'La app carga bastante más rápido (sobre todo con datos móviles) y se actualiza al instante. Además: las fechas respetan tu zona horaria, los movimientos del mismo día se ordenan del más reciente al más antiguo, y los respaldos grandes ya no fallan.',
  },

  // --- Novedades de la versión anterior ---
  {
    icon: '👛',
    title: 'Cuentas en varias monedas',
    description:
      'Crea tus propias cuentas (efectivo, banco, tarjeta) en pesos, euros, dólares o francos suizos. El cambio de moneda entre cuentas también vive ahí.',
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
