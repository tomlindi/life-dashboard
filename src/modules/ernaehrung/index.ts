// Meldet den Bereich "Ernährung" bei der App an.
import { lazy } from 'react'
import { Apple } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'ernaehrung',
  name: 'Ernährung',
  icon: Apple,
  farbe: '#a3e635',
  Seite: lazy(() => import('./Seite')),
}
export default modul
