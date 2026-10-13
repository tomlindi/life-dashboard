// Meldet den Bereich "Schule" bei der App an.
import { lazy } from 'react'
import { GraduationCap } from 'lucide-react'
import type { Modul } from '../../core/module'

const modul: Modul = {
  id: 'schule',
  name: 'Schule',
  icon: GraduationCap,
  farbe: '#ff9f0a',
  Seite: lazy(() => import('./Seite')),
  // Eigene Seite pro Fach mit Notizen, z. B. /schule/fach/abc123
  unterseiten: [{ pfad: 'fach/:id', Seite: lazy(() => import('./FachSeite')) }],
}
export default modul
