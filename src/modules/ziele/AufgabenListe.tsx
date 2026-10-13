// Aufgaben auf der Projektseite im Stil von Apple Erinnerungen:
//   • kleiner Kreis (22 px) auf Höhe der ersten Textzeile; erledigt = farbiger Ring mit Punkt
//   • lange Namen brechen unter sich selbst um, nicht unter den Kreis
//   • dünne Trennlinie, die erst beim Text beginnt
//   • keine Knöpfe in der Zeile: nach links wischen zeigt "Unteraufgabe" und "Löschen"
//   • neue Aufgabe direkt als leere Zeile am Ende der Liste (Enter = nächste)
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Flag } from 'lucide-react'
import type { Aufgabe, ProjektAufgabe } from '../../core/db'
import { relativ } from '../../core/format'
import { schalteErinnerung } from '../../core/apple'
import Aufklapper from '../../core/ui/Aufklapper'
import { loescheAufgabe, nachErstellt, neueAufgabe, schalteAufgabe } from './projekte'

// ---------- Kreis ----------

/** Runder Haken wie in Apple Erinnerungen. Die Trefferfläche ist 44 px groß, der Kreis selbst 22 px. */
function Kreis({ an, farbe, onClick, klein = false }: { an: boolean; farbe: string; onClick: () => void; klein?: boolean }) {
  const groesse = klein ? 20 : 22
  return (
    <button type="button" onClick={onClick} className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label={an ? 'Als offen markieren' : 'Als erledigt markieren'}>
      <span className="flex items-center justify-center rounded-full" style={{ width: groesse, height: groesse, border: `1.5px solid ${an ? farbe : '#636366'}`, transition: 'border-color 150ms' }}>
        {an && <span className="rounded-full" style={{ width: groesse - 8, height: groesse - 8, background: farbe }} />}
      </span>
    </button>
  )
}

// ---------- Nach links wischen ----------

interface Aktion {
  name: string
  farbe: string
  onClick: () => void
}

// Es ist immer höchstens eine Zeile aufgewischt: eine neue schließt die vorige
let schliesseVorige: (() => void) | null = null
const AKTION_BREITE = 84

/**
 * Zeile, die man nach links wischen kann, um Aktionen zu zeigen (wie in iOS).
 * Funktioniert mit Finger und Maus. Senkrechtes Scrollen bleibt möglich ("touch-action: pan-y").
 */
function WischZeile({ aktionen, children }: { aktionen: Aktion[]; children: ReactNode }) {
  const breite = aktionen.length * AKTION_BREITE
  const [x, setX] = useState(0)
  const [zieht, setZieht] = useState(false)
  const start = useRef<{ x: number; y: number; basis: number; waagrecht: boolean | null } | null>(null)
  const bewegt = useRef(false)
  const zeile = useRef<HTMLDivElement>(null)

  const schliessen = () => setX(0)

  // Antippen woanders schließt die aufgewischte Zeile
  useEffect(() => {
    if (x === 0) return
    const woanders = (e: PointerEvent) => {
      if (!zeile.current?.contains(e.target as Node)) schliessen()
    }
    document.addEventListener('pointerdown', woanders)
    return () => document.removeEventListener('pointerdown', woanders)
  }, [x])

  return (
    <div ref={zeile} className="relative overflow-hidden">
      {/* Aktionen liegen rechts hinter der Zeile */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: breite }}>
        {aktionen.map((a) => (
          <button
            key={a.name}
            onClick={() => {
              schliessen()
              a.onClick()
            }}
            className="flex flex-1 items-center justify-center text-[14px] font-medium text-white"
            style={{ background: a.farbe }}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div
        className="relative bg-karte"
        style={{ transform: `translateX(${x}px)`, transition: zieht ? 'none' : 'transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1)', touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, basis: x, waagrecht: null }
          bewegt.current = false
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          // Erst entscheiden, ob waagrecht gewischt oder senkrecht gescrollt wird
          if (s.waagrecht === null && Math.abs(dx) + Math.abs(dy) > 8) s.waagrecht = Math.abs(dx) > Math.abs(dy)
          if (!s.waagrecht) return
          if (!bewegt.current) {
            bewegt.current = true
            setZieht(true)
            if (schliesseVorige && schliesseVorige !== schliessen) schliesseVorige()
            schliesseVorige = schliessen
            e.currentTarget.setPointerCapture(e.pointerId)
          }
          setX(Math.min(0, Math.max(-breite - 30, s.basis + dx)))
        }}
        onPointerUp={() => {
          if (bewegt.current) setX((akt) => (akt < -breite / 2 ? -breite : 0)) // halb gewischt = ganz auf
          setZieht(false)
          start.current = null
        }}
        onPointerCancel={() => {
          setZieht(false)
          start.current = null
        }}
        onClickCapture={(e) => {
          // Nach einem Wisch kein "Antippen" auslösen; ist die Zeile offen, schließt ein Tipp sie nur
          if (bewegt.current || x !== 0) {
            e.preventDefault()
            e.stopPropagation()
            if (!bewegt.current) schliessen()
          }
          bewegt.current = false
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ---------- Zeilen ----------

/** Grundlayout einer Zeile: Kreis links, Text rechts mit Trennlinie ab dem Text. */
function Zeile({ kreis, children, linie }: { kreis: ReactNode; children: ReactNode; linie: boolean }) {
  return (
    <div className="flex items-start">
      {kreis}
      <div className={`min-w-0 flex-1 py-[11px] pr-2 ${linie ? 'border-b border-linie' : ''}`}>{children}</div>
    </div>
  )
}

/** Leere Zeile zum Hinzufügen (gestrichelter Kreis). Enter fügt hinzu und lässt das Feld offen für die nächste. */
export function NeueZeile({ platzhalter, onNeu, onFertig, autoFocus = false, klein = false }: { platzhalter: string; onNeu: (titel: string) => void; onFertig?: () => void; autoFocus?: boolean; klein?: boolean }) {
  const [text, setText] = useState('')
  const hinzufuegen = () => {
    if (text.trim()) onNeu(text.trim())
    setText('')
  }
  return (
    <div className="flex items-start">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center">
        <span className="rounded-full border-[1.5px] border-dashed border-[#636366]" style={{ width: klein ? 20 : 22, height: klein ? 20 : 22 }} />
      </span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') hinzufuegen()
          if (e.key === 'Escape') onFertig?.()
        }}
        onBlur={() => {
          hinzufuegen()
          onFertig?.()
        }}
        enterKeyHint="next"
        autoFocus={autoFocus}
        placeholder={platzhalter}
        className={`h-11 min-w-0 flex-1 bg-transparent pr-2 outline-none placeholder:text-grau ${klein ? 'text-[15px]' : 'text-[16px]'}`}
      />
    </div>
  )
}

/** Eine Aufgabe mit ihren Unteraufgaben. */
function AufgabeEintrag({ a, unter, farbe, linie }: { a: ProjektAufgabe; unter: ProjektAufgabe[]; farbe: string; linie: boolean }) {
  const [neueUnter, setNeueUnter] = useState(false)
  const offen = unter.filter((u) => !u.erledigt)
  const erledigt = unter.filter((u) => u.erledigt)
  const loeschen = (x: ProjektAufgabe, mitUnter: boolean) => confirm(mitUnter ? `„${x.titel}“ samt Unteraufgaben löschen?` : `„${x.titel}“ löschen?`) && loescheAufgabe(x)

  /** Eine Unteraufgabe (nur "Löschen" beim Wischen). */
  const unterZeile = (u: ProjektAufgabe) => (
    <WischZeile key={u.id} aktionen={[{ name: 'Löschen', farbe: '#ff453a', onClick: () => loeschen(u, false) }]}>
      <Zeile kreis={<Kreis an={u.erledigt} farbe={farbe} onClick={() => schalteAufgabe(u)} klein />} linie>
        <p className={`break-words text-[15px] leading-snug ${u.erledigt ? 'text-grau' : ''}`}>{u.titel}</p>
      </Zeile>
    </WischZeile>
  )

  return (
    <li>
      <WischZeile
        aktionen={[
          ...(a.erledigt ? [] : [{ name: 'Unteraufgabe', farbe: '#636366', onClick: () => setNeueUnter(true) }]),
          { name: 'Löschen', farbe: '#ff453a', onClick: () => loeschen(a, unter.length > 0) },
        ]}
      >
        <Zeile kreis={<Kreis an={a.erledigt} farbe={farbe} onClick={() => schalteAufgabe(a)} />} linie={linie || unter.length > 0 || neueUnter}>
          <p className={`break-words text-[16px] leading-snug ${a.erledigt ? 'text-grau' : ''}`}>{a.titel}</p>
          {unter.length > 0 && (
            <p className="mt-0.5 text-[12px] text-grau">
              {erledigt.length} von {unter.length} Unteraufgaben erledigt
            </p>
          )}
        </Zeile>
      </WischZeile>

      {/* Unteraufgaben: eingerückt genau unter den Text der Aufgabe */}
      {(unter.length > 0 || neueUnter) && (
        <div className="pl-11">
          {offen.map(unterZeile)}
          {neueUnter && <NeueZeile platzhalter="Neue Unteraufgabe" onNeu={(titel) => neueAufgabe(a.projektId, titel, a.id)} onFertig={() => setNeueUnter(false)} autoFocus klein />}
          {erledigt.length > 0 && (
            <div className="pl-3">
              <Aufklapper titel={`${erledigt.length} erledigt`} klein>
                {erledigt.map(unterZeile)}
              </Aufklapper>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/** Die ganze Aufgabenliste eines Projekts: offene Aufgaben, Zeile "Neue Aufgabe", eingeklappt die erledigten. */
export default function AufgabenListe({ projektId, aufgaben, farbe }: { projektId: string; aufgaben: ProjektAufgabe[]; farbe: string }) {
  const haupt = aufgaben.filter((a) => !a.elternId).sort(nachErstellt)
  const unterVon = (a: ProjektAufgabe) => aufgaben.filter((u) => u.elternId === a.id).sort(nachErstellt)
  const offen = haupt.filter((a) => !a.erledigt)
  const erledigt = haupt.filter((a) => a.erledigt)

  return (
    <div className="-ml-2">
      <ul>
        {offen.map((a) => (
          <AufgabeEintrag key={a.id} a={a} unter={unterVon(a)} farbe={farbe} linie />
        ))}
      </ul>
      <NeueZeile platzhalter="Neue Aufgabe" onNeu={(titel) => neueAufgabe(projektId, titel)} />
      {erledigt.length > 0 && (
        <div className="pl-2">
          <Aufklapper titel={`${erledigt.length} erledigt`} klein>
            <ul className="-ml-2">
              {erledigt.map((a, i) => (
                <AufgabeEintrag key={a.id} a={a} unter={unterVon(a)} farbe={farbe} linie={i < erledigt.length - 1} />
              ))}
            </ul>
          </Aufklapper>
        </div>
      )}
      <p className="pl-2 pt-1 text-[12px] text-grau">Tipp: Aufgabe nach links wischen für Unteraufgabe oder Löschen.</p>
    </div>
  )
}

/** Eine zugeordnete Erinnerung im selben Stil. Abhaken wird beim nächsten Abgleich an Apple geschickt. */
export function ErinnerungEintrag({ a, farbe, linie }: { a: Aufgabe; farbe: string; linie: boolean }) {
  return (
    <Zeile kreis={<Kreis an={a.erledigt} farbe={farbe} onClick={() => schalteErinnerung(a)} />} linie={linie}>
      <p className={`flex items-start gap-1.5 break-words text-[16px] leading-snug ${a.erledigt ? 'text-grau' : ''}`}>
        <span className="min-w-0 flex-1">{a.titel}</span>
        {a.markiert && <Flag size={14} color="#ff9f0a" fill="#ff9f0a" className="mt-1 shrink-0" />}
      </p>
      {(a.faellig || a.liste) && <p className="mt-0.5 text-[12px] text-grau">{[a.faellig ? relativ(a.faellig) : null, a.liste].filter(Boolean).join(' · ')}</p>}
    </Zeile>
  )
}
