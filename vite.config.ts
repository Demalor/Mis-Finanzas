import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages sirve la app desde un subpath; Firebase Hosting desde la raíz.
  // El script deploy:firebase pasa VITE_BASE_PATH=/ para ese build.
  base: process.env.VITE_BASE_PATH ?? '/Mis-Finanzas/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Agrupa las librerías grandes en chunks estables: así un cambio de
        // código de una página no invalida el caché de firebase/recharts/react.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@firebase') || id.includes('/firebase/')) return 'firebase'
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'recharts'
          if (id.includes('react-router') || id.includes('@remix-run')) return 'router'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react'
        },
      },
    },
  },
})
