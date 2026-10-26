import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// La app se publica en GitHub Pages bajo https://onemoreint.github.io/redes-app/
export default defineConfig({
  base: '/redes-app/',
  plugins: [react(), tailwindcss()],
  build: {
    // ExcelJS (~930 kB) es un bloque aparte que solo se descarga al importar o exportar Excel;
    // las páginas se cargan por ruta. El aviso se ajusta para no ocultar otros bloques grandes.
    chunkSizeWarningLimit: 1000,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
  },
})
