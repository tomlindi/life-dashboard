// Meldet den Bereich "Ziele" bei der App an.
import { lazy } from 'react'
import { Target } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'ziele',
  name: 'Ziele',
  icon: Target,
  farbe: '#bf5af2',
  Seite: lazy(() => import('./Seite')),
}
export default modul
