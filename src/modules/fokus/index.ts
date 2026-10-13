// Meldet den Bereich "Fokus" bei der App an (Pomodoro-Timer und Stoppuhr).
import { lazy } from 'react'
import { Timer } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'fokus',
  name: 'Fokus',
  icon: Timer,
  farbe: '#ff9f0a',
  Seite: lazy(() => import('./Seite')),
}
export default modul
