// Meldet den Bereich "Notizen" bei der App an.
import { lazy } from 'react'
import { StickyNote } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'notizen',
  name: 'Notizen',
  icon: StickyNote,
  farbe: '#ffd60a',
  Seite: lazy(() => import('./Seite')),
}
export default modul
