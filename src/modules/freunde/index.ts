// Meldet den Bereich "Freunde" bei der App an.
import { lazy } from 'react'
import { Users } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'freunde',
  name: 'Freunde',
  icon: Users,
  farbe: '#ff6482',
  Seite: lazy(() => import('./Seite')),
}
export default modul
