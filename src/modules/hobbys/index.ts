// Meldet den Bereich "Hobbys" bei der App an.
import { lazy } from 'react'
import { Palette } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'hobbys',
  name: 'Hobbys',
  icon: Palette,
  farbe: '#ffd60a',
  Seite: lazy(() => import('./Seite')),
}
export default modul
