// Konfiguration für Vite (das Werkzeug, das deine App baut und im Browser startet)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import paket from './package.json' with { type: 'json' }

export default defineConfig({
  // './' = alle Pfade relativ. So läuft die App auch unter
  // deinname.github.io/life-dashboard/ (also in einem Unterordner).
  base: './',
  // Versionsnummer aus package.json in die App einsetzen (angezeigt unten in den Einstellungen).
  // Neue Funktion: 1.0.0 -> 1.1.0, Fehlerkorrektur: 1.1.0 -> 1.1.1
  define: { __APP_VERSION__: JSON.stringify(paket.version) },
  plugins: [
    react(),
    tailwindcss(),
    // PWA: erzeugt Manifest + Service Worker (macht die App offlinefähig)
    VitePWA({
      registerType: 'autoUpdate', // neue Versionen laden sich von selbst
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Life Dashboard',
        short_name: 'Life',
        description: 'Mein persönliches Lebens-Dashboard',
        lang: 'de',
        display: 'standalone', // Vollbild ohne Browser-Leiste
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alle diese Dateien werden fürs Offline-Arbeiten zwischengespeichert
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      },
    }),
  ],
})
