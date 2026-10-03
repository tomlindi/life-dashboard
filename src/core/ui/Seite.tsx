// Rahmen für jede Seite: große Überschrift (wie bei Apple) und Abstand.
// Die Safe Area (Notch oben) behandelt App.tsx, hier geht es nur um den Inhalt.
import type { ReactNode } from 'react'

interface Props {
  titel: string
  untertitel?: string
  farbe?: string
  children: ReactNode
}

export default function Seite({ titel, untertitel, farbe, children }: Props) {
  return (
    <div className="px-4 pb-8 pt-3">
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
