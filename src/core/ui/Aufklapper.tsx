// Ein Abschnitt zum Auf- und Zuklappen, wie in Apple-Apps: Titel (mit Anzahl) und ein Pfeil, der sich dreht.
// Die Höhe ändert sich weich: Trick mit CSS-Grid ("0fr" -> "1fr"), so muss nichts ausgemessen werden.
import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { lesbar } from '../darstellung'

interface Props {
  titel: string
  anzahl?: number // erscheint in Klammern, z. B. "Termine (2)"
  standardOffen?: boolean
  farbe?: string // Farbe von Titel und Pfeil
  klein?: boolean // kleinere Schrift, z. B. für "3 erledigt ›" innerhalb einer Liste
  children: ReactNode
}

export default function Aufklapper({ titel, anzahl, standardOffen = false, farbe, klein = false, children }: Props) {
  const [offen, setOffen] = useState(standardOffen)
  return (
    <div>
      <button
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        className={`tippbar flex w-full items-center gap-1.5 text-left ${klein ? 'min-h-9 text-[14px] text-grau' : 'min-h-11 text-[16px] font-semibold'}`}
        style={{ color: klein ? undefined : lesbar(farbe) }}
      >
        <span className="flex-1">
          {titel}
          {anzahl !== undefined && ` (${anzahl})`}
        </span>
        <ChevronRight size={klein ? 16 : 18} className="shrink-0 text-grau" style={{ transform: offen ? 'rotate(90deg)' : 'none', transition: 'transform 250ms ease' }} />
      </button>
      <div className="grid" style={{ gridTemplateRows: offen ? '1fr' : '0fr', transition: 'grid-template-rows 250ms ease' }}>
        {/* overflow-hidden + min-h-0: der Inhalt wird beim Zuklappen sauber abgeschnitten */}
        <div className="min-h-0 overflow-hidden" style={{ opacity: offen ? 1 : 0, transition: 'opacity 250ms ease' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
