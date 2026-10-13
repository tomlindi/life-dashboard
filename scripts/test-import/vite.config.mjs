// Baut den Import-Test (scripts/test-import/test.ts) zu einer Datei, die Node direkt ausführen kann.
// Start: npm run test:import
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: 'scripts/test-import/test.ts', // "ssr" = für Node bauen, Pakete aus node_modules bleiben extern
    outDir: 'node_modules/.test-import',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'test.mjs' } },
  },
})
