// Rahmen für jede Seite: große Überschrift (wie bei Apple) und Abstand.
// Die Safe Area (Notch oben) behandelt App.tsx, hier geht es nur um den Inhalt.
// Auf Seiten, die nicht in der Tab-Leiste stehen, gibt es oben links "‹ Zurück".
// Das ist wichtig: Als Homescreen-App hat das iPhone keine Zurück-Wischgeste vom Rand,
// und die Tab-Leiste ist auf diesen Seiten eingefahren.
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ZurueckKnopf, istUebersicht } from './TabLeiste'

interface Props {
  titel: string
  untertitel?: string
  farbe?: string
  children: ReactNode
}

export default function Seite({ titel, untertitel, farbe, children }: Props) {
  const { pathname } = useLocation()
  return (
    <div className="px-4 pb-8 pt-3">
      {!istUebersicht(pathname) && <ZurueckKnopf farbe={farbe} />}
      <header className="mb-4 px-1">
        {untertitel && <p className="text-[13px] font-semibold uppercase tracking-wide text-grau">{untertitel}</p>}
        <h1 className="text-[34px] font-bold leading-tight" style={{ color: farbe }}>
          {titel}
        </h1>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
