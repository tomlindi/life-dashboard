// Meldet den Bereich "Fitness" bei der App an.
import { lazy } from 'react'
import { Dumbbell } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'fitness',
  name: 'Fitness',
  icon: Dumbbell,
  farbe: '#ff375f',
  Seite: lazy(() => import('./Seite')),
}
export default modul
