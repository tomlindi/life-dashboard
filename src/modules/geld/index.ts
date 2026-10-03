// Meldet den Bereich "Geld" bei der App an.
import { lazy } from 'react'
import { Wallet } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'geld',
  name: 'Geld',
  icon: Wallet,
  farbe: '#64d2ff',
  Seite: lazy(() => import('./Seite')),
}
export default modul
