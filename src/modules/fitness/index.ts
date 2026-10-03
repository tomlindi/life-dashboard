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
  // Unterseiten für das Gym-Training
  unterseiten: [
    { pfad: 'gym', Seite: lazy(() => import('./gym/GymSeite')) },
    { pfad: 'gym/training/:id', Seite: lazy(() => import('./gym/TrainingSeite')) },
    { pfad: 'gym/plan/:id', Seite: lazy(() => import('./gym/PlanSeite')) },
    // Eigene Seite pro Sportart, z. B. /fitness/sport/Laufen
    { pfad: 'sport/:art', Seite: lazy(() => import('./SportSeite')) },
  ],
}
export default modul
