# Nummi — App de finanzas personales multiusuario

Aplicación web para que cada persona administre sus propios ingresos y gastos, con
cuentas privadas independientes. Usa Firebase (Authentication + Firestore) como
backend y se publica gratis en GitHub Pages.

## Cómo ejecutarla en local

Necesitas tener Node.js instalado (versión 18 o superior).

```bash
npm install
npm run dev
```

Luego abre la dirección que aparece en la terminal (normalmente http://localhost:5173, o el puerto que Vite elija).

## Cómo generar una versión para producción

```bash
npm run build
npm run preview
```

## Cómo publicar en GitHub Pages

```bash
npm run deploy
```

Esto compila la aplicación y la publica en la rama `gh-pages` del repositorio.

## Funcionalidades

- **Inicio**: balance del mes por moneda, alertas de pagos próximos (tarjetas y préstamos), resumen por categoría y movimientos recientes.
- **Movimientos**: lista con búsqueda/filtros/edición, y pestaña de movimientos recurrentes (arriendo, salario, suscripciones).
- **Agregar**: formulario de ingreso/gasto con cuenta, categoría, fuente de ingreso (opcional) y fecha.
- **Cuentas**: cuentas de efectivo, banco y tarjetas de crédito en distintas monedas (COP/EUR/USD/CHF), cambio de moneda entre cuentas con tasa automática, e historial de cambios.
- **Préstamos**: control de deudas propias y dinero prestado a terceros, con desglose opcional de capital/interés por cuota.
- **Organización**: categorías de ingreso/gasto, fuentes de ingreso, y presupuestos mensuales por categoría.
- **Resumen**: gráficos (distribución por categoría, evolución mensual) y vista de tabla tipo Excel con filtros, orden y selección múltiple.
- **Configuración**: perfil, modo oscuro/claro, respaldo (exportar/importar JSON, exportar CSV), y borrado de datos.
- **Administración** (solo el admin): códigos de invitación para nuevas cuentas, y gestión de cuentas de usuarios (activar/desactivar, última conexión) — sin acceso a los datos financieros de nadie.

## Tecnología

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Firebase (Authentication + Firestore),
Recharts para gráficos. Las páginas se cargan de forma perezosa (code-splitting) para mantener
la carga inicial liviana.
