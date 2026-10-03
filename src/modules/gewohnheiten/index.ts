// Meldet den Bereich "Gewohnheiten" bei der App an.
import { lazy } from 'react'
import { CircleCheckBig } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'gewohnheiten',
  name: 'Gewohnheiten',
  icon: CircleCheckBig,
  farbe: '#30d158',
  Seite: lazy(() => import('./Seite')),
}
export default modul
