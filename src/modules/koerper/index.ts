// Meldet den Bereich "Körper" bei der App an (Gewicht, Körperfett, Größe, BMI).
import { lazy } from 'react'
import { PersonStanding } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'koerper',
  name: 'Körper',
  icon: PersonStanding,
  farbe: '#40c8e0',
  Seite: lazy(() => import('./Seite')),
}
export default modul
