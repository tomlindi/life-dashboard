// Kleine, wiederverwendbare Formular-Bausteine im Apple-Stil.
// Alle Bereiche benutzen sie, damit die App überall gleich aussieht.
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

/** Auswahl als runde "Chips" (z. B. Klausur / Mündlich / Test). */
export function Chips<T extends string>({
  optionen,
  wert,
  onWahl,
  farbe,
}: {
  optionen: readonly T[]
  wert: T
  onWahl: (w: T) => void
  farbe: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {optionen.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onWahl(o)}
          className="tippbar min-h-11 rounded-full px-4 text-[15px] font-medium"
          style={{ background: wert === o ? farbe : '#2c2c2e', color: wert === o ? '#000' : '#fff' }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** Ein Eingabefeld mit Beschriftung darüber. */
export function Eingabe({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-[13px] text-grau">{label}</span>
      <input {...props} className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau" />
    </label>
  )
}

/** Beschriftung für einen Abschnitt im Formular. */
export const Label = ({ children }: { children: ReactNode }) => <p className="mb-1.5 text-[13px] text-grau">{children}</p>

/** Großer, farbiger Knopf (z. B. "Speichern"). */
export function Knopf({
  farbe,
  onClick,
  children,
  deaktiviert,
}: {
  farbe: string
  onClick: () => void
  children: ReactNode
  deaktiviert?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deaktiviert}
      className="tippbar flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-black disabled:opacity-40"
      style={{ background: farbe }}
    >
      {children}
    </button>
  )
}

/** Grauer Hinweistext, wenn eine Liste leer ist. */
export const Leer = ({ children }: { children: ReactNode }) => <p className="text-[14px] text-grau">{children}</p>

/** Papierkorb-Knopf mit Sicherheitsabfrage. */
export function LoeschKnopf({ frage, onLoeschen }: { frage: string; onLoeschen: () => void }) {
  return (
    <button
      type="button"
      onClick={() => confirm(frage) && onLoeschen()}
      className="tippbar flex h-11 w-11 shrink-0 items-center justify-center text-grau"
      aria-label="Löschen"
    >
      <Trash2 size={18} />
    </button>
  )
}

/** Runder Haken zum Abhaken (Aufgaben, Unterziele …). */
export function Haken({ an, farbe, onClick }: { an: boolean; farbe: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tippbar flex h-11 w-11 shrink-0 items-center justify-center"
      aria-label={an ? 'Als offen markieren' : 'Als erledigt markieren'}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[14px] font-bold text-black"
        style={{ borderColor: an ? farbe : '#8e8e93', background: an ? farbe : 'transparent' }}
      >
        {an ? '✓' : ''}
      </span>
    </button>
  )
}

/** Dünner Fortschrittsbalken (0 bis 1). */
export function Balken({ wert, farbe }: { wert: number; farbe: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: farbe + '33' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(1, Math.max(0, wert)) * 100}%`, background: farbe }} />
    </div>
  )
}

/** Eine Zeile "Text eintippen + Enter" zum schnellen Hinzufügen (z. B. Unterziele, Aufgaben). */
export function SchnellEingabe({ platzhalter, farbe, onNeu }: { platzhalter: string; farbe: string; onNeu: (text: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const feld = e.currentTarget.elements.namedItem('text') as HTMLInputElement
        if (feld.value.trim()) onNeu(feld.value.trim())
        feld.value = ''
      }}
      className="flex gap-2"
    >
      <input name="text" placeholder={platzhalter} className="h-11 min-w-0 flex-1 rounded-xl bg-karte2 px-3 outline-none placeholder:text-grau" />
      <button type="submit" className="tippbar h-11 w-11 shrink-0 rounded-xl text-[22px] font-semibold text-black" style={{ background: farbe }} aria-label="Hinzufügen">
        +
      </button>
    </form>
  )
}

/** "+ Hinzufügen"-Knopf oben rechts in einer Karte. */
export function PlusKnopf({ farbe, onClick, label = 'Neu' }: { farbe: string; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="tippbar min-h-9 rounded-full px-3 text-[15px] font-semibold" style={{ color: farbe }}>
      + {label}
    </button>
  )
}
