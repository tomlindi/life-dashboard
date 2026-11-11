// Meldet den Bereich "Studium" bei der App an: Studienwahl, Hochschulen, Firmen fürs Praxisstudium, Fristen.
import { lazy } from 'react'
import { Compass } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'studium',
  name: 'Studium',
  icon: Compass,
  farbe: '#7aa2ff',
  Seite: lazy(() => import('./Seite')),
}
export default modul
