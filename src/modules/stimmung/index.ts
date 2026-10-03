// Meldet den Bereich "Stimmung" bei der App an.
import { lazy } from 'react'
import { Smile } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'stimmung',
  name: 'Stimmung',
  icon: Smile,
  farbe: '#ac8e68',
  Seite: lazy(() => import('./Seite')),
}
export default modul
