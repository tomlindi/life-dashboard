// Der Startpunkt: hier wird die App in die Seite (index.html) eingehängt.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register' // meldet den Service Worker an (Offline-Modus)
import './index.css'
import App from './App'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
