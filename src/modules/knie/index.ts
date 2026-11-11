// Meldet den Bereich "Knie" bei der App an: Reha nach der Kreuzband-OP.
import { lazy } from 'react'
import { Bandage } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'knie',
  name: 'Knie',
  icon: Bandage,
  farbe: '#66d4cf',
  Seite: lazy(() => import('./Seite')),
}
export default modul
