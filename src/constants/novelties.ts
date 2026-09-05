// Se incrementa cada vez que se agregan novedades que vale la pena anunciar.
// Cuando el perfil del usuario tiene un número menor guardado, se le muestra el modal de novedades.
export const CURRENT_NOVELTIES_VERSION = 4

export const NOVELTIES: { icon: string; title: string; description: string }[] = [
  // --- Novedades de esta versión ---
  {
    icon: '🪙',
    title: 'La app tiene nombre nuevo: Nummi',
    description:
      'Antes "Mis Finanzas", ahora Nummi. Mismo proyecto, mismo dueño (yo, Demalor 👋), tus datos intactos — solo le puse un nombre que sintiera propio.',
  },
  {
    icon: '🎨',
    title: 'Cara nueva de arriba a abajo',
    description:
      'Paleta de colores renovada y un logo propio que vas a ver en el menú lateral y en la parte de arriba en celular, tanto en modo claro como oscuro.',
  },

  // --- Novedades de la versión anterior ---
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
    icon: '🔁',
    title: 'Recurrentes con cuenta',
    description:
      'Al crear un movimiento recurrente (arriendo, salario…) ahora eliges a qué cuenta se carga, así queda en la moneda correcta.',
  },
]
