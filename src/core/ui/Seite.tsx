// Rahmen für jede Seite: große Überschrift (wie bei Apple) und Abstand.
// Die Safe Area (Notch oben) behandelt App.tsx, hier geht es nur um den Inhalt.
// Auf Seiten, die nicht im Dock stehen, gibt es oben links "‹ Zurück".
// Das ist wichtig: Als Homescreen-App hat das iPhone keine eigene Zurück-Wischgeste vom Rand.
// Deshalb baut die App sie selbst nach: vom linken Rand nach rechts wischen (siehe core/ui/Dock.tsx).
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ZurueckKnopf, useIstUebersicht } from './Dock'
import { lesbar } from '../darstellung'

interface Props {
  titel: string
  untertitel?: string
  farbe?: string
  rechts?: ReactNode // z. B. ein kleiner Knopf rechts neben der Überschrift
  children: ReactNode
}

export default function Seite({ titel, untertitel, farbe, rechts, children }: Props) {
  const uebersicht = useIstUebersicht(useLocation().pathname)
  return (
    <div className="px-4 pb-8 pt-3">
      {!uebersicht && <ZurueckKnopf farbe={farbe} />}
      <header className="mb-4 flex items-end gap-3 px-1">
        <div className="min-w-0 flex-1">
          {untertitel && <p className="text-[13px] font-semibold uppercase tracking-wide text-grau">{untertitel}</p>}
          <h1 className="text-[34px] font-bold leading-tight" style={{ color: lesbar(farbe) }}>
            {titel}
          </h1>
        </div>
        {rechts && <div className="mb-1 shrink-0">{rechts}</div>}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
