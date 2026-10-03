// Meldet den Bereich "Schlaf" bei der App an.
import { lazy } from 'react'
import { Moon } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'schlaf',
  name: 'Schlaf',
  icon: Moon,
  farbe: '#5e5ce6',
  Seite: lazy(() => import('./Seite')),
}
export default modul
