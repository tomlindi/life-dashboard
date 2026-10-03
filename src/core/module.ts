// So beschreibt sich ein Lebensbereich (Modul).
// Jeder Ordner in src/modules/ exportiert genau so ein Objekt.
// Die App liest alle Module aus der Liste in src/modules/index.ts und baut daraus
// automatisch Routen, Kacheln und das "Mehr"-Menü.
import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface Modul {
  id: string // z. B. "fitness" (wird zur Adresse /fitness)
  name: string // z. B. "Fitness"
  icon: LucideIcon
  farbe: string // Akzentfarbe dieses Bereichs
  /** Die Seite des Bereichs. "lazy" = wird erst geladen, wenn man sie öffnet. */
  Seite: LazyExoticComponent<ComponentType>
  /** Kurzer Text für die Kachel auf der Startseite (optional, kommt aus den Daten) */
  Kachel?: ComponentType
  /** Weitere Unterseiten, z. B. { pfad: 'gym', Seite: … } wird zu /fitness/gym */
  unterseiten?: { pfad: string; Seite: LazyExoticComponent<ComponentType> }[]
}
