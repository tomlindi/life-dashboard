// Kalender-Karte für Monat und Jahr, z. B. Trainingskalender (Fitness) oder Essenskalender (Ernährung).
// Eingeklappt (Normalzustand): nur der aktuelle Monat mit ein paar Zahlen daneben. Die ganze Karte ist ein Knopf.
// Antippen klappt das ganze Jahr auf, wie im Apple-Kalender: 12 kleine Monate, Jahr wechseln, Tag antippen für Details.
// Was ein Tag bedeutet (Farbe, Details, Legende), bestimmt der Bereich, der den Kalender benutzt.
//
// Benutzung (Beispiel):
//   <JahresKalender
//     titel="Trainingskalender" akzent="#ff375f"
//     hintergrundAm={(tag) => farbe}           // Farbe oder CSS-Verlauf, undefined = leerer Tag
//     ariaAm={(tag) => 'Laufen'}               // Text zum Vorlesen, das Datum kommt automatisch davor
//     monat={{ zahl: 3, einheit: 'Workouts', zeile: 'an 2 Tagen', imJahr: 181 }}
//     jahresZeile={(jahr) => <>…</>}  zeilenAm={(tag) => [...]}  leerText="Kein Training"  legende={(jahr) => [...]}
//   />
import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { heute, tagString } from '../datum'
import { kurzDatum } from '../format'
import Karte from './Karte'

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WOCHENTAGE = ['M', 'D', 'M', 'D', 'F', 'S', 'S']
/** Farbe eines Tages ohne Eintrag. */
const LEER = '#2c2c2e'

/** Eine Zeile in den Details eines angetippten Tages, z. B. ein Workout oder eine Mahlzeit. */
export interface TagesZeile {
  id: string
  farbe: string // Punkt vorne
  text: string
  rechts?: string // grauer Text rechts, z. B. "45 Min"
}

/** Ein Eintrag der Legende: Farbe, Name und wie oft im gewählten Jahr. */
export interface LegendenEintrag {
  farbe: string
  name: string
  anzahl: number
}

interface Props {
  titel: string
  akzent: string // Farbe der Überschrift und des Rahmens um heute
  /** CSS-Hintergrund eines Tages ("JJJJ-MM-TT"): eine Farbe oder ein Verlauf. undefined = leerer Tag. */
  hintergrundAm: (tag: string) => string | undefined
  /** Kurzer Text zum Vorlesen (VoiceOver), z. B. "Laufen, Gym". Das Datum kommt automatisch davor. */
  ariaAm: (tag: string) => string
  /** Eingeklappt, rechts neben dem Monat: große Zahl mit Einheit, eine graue Zeile darunter und die Anzahl im ganzen Jahr. */
  monat: { zahl: number; einheit: string; zeile: ReactNode; imJahr: number }
  /** Ausgeklappt, über den Monaten: Zusammenfassung des gewählten Jahres. */
  jahresZeile: (jahr: number) => ReactNode
  /** Ausgeklappt: was an einem angetippten Tag war. Leere Liste = leerText. */
  zeilenAm: (tag: string) => TagesZeile[]
  leerText: string
  /** Ausgeklappt, ganz unten: was die Farben bedeuten (im gewählten Jahr). Leere Liste = keine Legende. */
  legende: (jahr: number) => LegendenEintrag[]
}

export default function JahresKalender(props: Props) {
  const [offen, setOffen] = useState(false)
  return offen ? <GanzesJahr {...props} onZu={() => setOffen(false)} /> : <DieserMonat {...props} onAuf={() => setOffen(true)} />
}

/** Ein Monat als Raster (Montag zuerst). Mit onTag sind die Tage einzeln antippbar. */
function Monat({ jahr, monat, akzent, hintergrundAm, ariaAm, gewaehlt, onTag, rund = 3 }: {
  jahr: number
  monat: number
  akzent: string
  hintergrundAm: Props['hintergrundAm']
  ariaAm: Props['ariaAm']
  gewaehlt?: string | null
  onTag?: (t: string) => void
  rund?: number
}) {
  const h = heute()
  const versatz = (new Date(jahr, monat, 1, 12).getDay() + 6) % 7 // Montag = 0
  const anzahlTage = new Date(jahr, monat + 1, 0).getDate()
  return (
    <div className="grid grid-cols-7 gap-[2px]">
      {Array.from({ length: versatz }, (_, i) => (
        <span key={`l${i}`} />
      ))}
      {Array.from({ length: anzahlTage }, (_, i) => {
        const t = tagString(new Date(jahr, monat, i + 1, 12))
        // Zukunft blass, heute mit Rahmen in der Akzentfarbe, angetippter Tag weiß umrandet
        const stil = {
          background: hintergrundAm(t) ?? LEER,
          borderRadius: rund,
          opacity: t > h ? 0.35 : 1,
          outline: t === gewaehlt ? '2px solid #fff' : t === h ? `1.5px solid ${akzent}` : undefined,
          outlineOffset: 1,
        }
        return onTag ? (
          <button key={t} onClick={() => onTag(t)} aria-label={`${kurzDatum(t)}: ${ariaAm(t)}`} className="aspect-square" style={stil} />
        ) : (
          <span key={t} className="aspect-square" style={stil} />
        )
      })}
    </div>
  )
}

/** Eingeklappt: aktueller Monat links, Zahlen rechts. Die ganze Karte ist ein Knopf. */
function DieserMonat({ titel, akzent, hintergrundAm, ariaAm, monat: zahlen, onAuf }: Props & { onAuf: () => void }) {
  const h = heute()
  const jahr = Number(h.slice(0, 4))
  const monat = Number(h.slice(5, 7)) - 1
  const monatsName = new Date(jahr, monat, 1).toLocaleDateString('de-DE', { month: 'long' })

  return (
    <button onClick={onAuf} className="tippbar block w-full text-left" aria-label="Ganzes Jahr anzeigen">
      <Karte
        titel={titel}
        akzent={akzent}
        rechts={
          <span className="flex items-center text-[13px] text-grau">
            Jahr <ChevronRight size={16} />
          </span>
        }
      >
        <div className="flex items-center gap-5">
          <div className="w-[136px] shrink-0">
            <div className="mb-[3px] grid grid-cols-7 gap-[2px] text-center text-[9px] font-semibold text-grau">
              {WOCHENTAGE.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <Monat jahr={jahr} monat={monat} akzent={akzent} hintergrundAm={hintergrundAm} ariaAm={ariaAm} rund={4} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] capitalize text-grau">{monatsName}</p>
            <p className="text-[26px] font-bold leading-tight">
              {zahlen.zahl}
              <span className="text-[15px] font-medium text-grau"> {zahlen.einheit}</span>
            </p>
            <p className="text-[13px] text-grau">{zahlen.zeile}</p>
            <p className="mt-2 text-[13px]">
              <b>{zahlen.imJahr}</b> <span className="text-grau">in {jahr}</span>
            </p>
          </div>
        </div>
      </Karte>
    </button>
  )
}

/** Ausgeklappt: 12 Monate, Jahr wechseln, Tag antippen, Legende. */
function GanzesJahr({ titel, akzent, hintergrundAm, ariaAm, jahresZeile, zeilenAm, leerText, legende, onZu }: Props & { onZu: () => void }) {
  const [jahr, setJahr] = useState(Number(heute().slice(0, 4)))
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const zeilen = gewaehlt ? zeilenAm(gewaehlt) : []
  const eintraege = legende(jahr)

  const wechsle = (n: number) => {
    setJahr(jahr + n)
    setGewaehlt(null)
  }
  const rund = 'tippbar flex h-8 w-8 items-center justify-center rounded-full bg-karte2'

  return (
    <Karte
      titel={titel}
      akzent={akzent}
      rechts={
        <div className="flex items-center gap-2">
          <button onClick={() => wechsle(-1)} className={rund} aria-label="Vorheriges Jahr">
            <ChevronLeft size={16} />
          </button>
          <span className="w-10 text-center text-[15px] font-semibold tabular-nums">{jahr}</span>
          <button onClick={() => wechsle(1)} className={rund} aria-label="Nächstes Jahr">
            <ChevronRight size={16} />
          </button>
          <button onClick={onZu} className={rund} aria-label="Einklappen">
            <ChevronUp size={16} />
          </button>
        </div>
      }
    >
      <p className="mb-3 text-[15px]">{jahresZeile(jahr)}</p>

      {/* 12 Monate, 3 nebeneinander */}
      <div className="grid grid-cols-3 gap-3">
        {MONATE.map((name, m) => (
          <div key={name}>
            <p className="mb-1 text-[11px] font-semibold text-grau">{name}</p>
            <Monat
              jahr={jahr}
              monat={m}
              akzent={akzent}
              hintergrundAm={hintergrundAm}
              ariaAm={ariaAm}
              gewaehlt={gewaehlt}
              onTag={(t) => setGewaehlt(gewaehlt === t ? null : t)}
            />
          </div>
        ))}
      </div>

      {/* Angetippter Tag */}
      {gewaehlt && (
        <div className="mt-3 rounded-2xl bg-karte2 px-3 py-2.5">
          <p className="text-[13px] font-semibold">{new Date(gewaehlt + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {zeilen.length === 0 ? (
            <p className="text-[13px] text-grau">{leerText}</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {zeilen.map((z) => (
                <li key={z.id} className="flex items-center gap-2 text-[13px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: z.farbe }} />
                  <span className="flex-1">{z.text}</span>
                  {z.rechts && <span className="text-grau">{z.rechts}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Legende: Farbe = Bedeutung, Zahl = wie oft im Jahr */}
      {eintraege.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {eintraege.map((e) => (
            <span key={e.name} className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: e.farbe }} />
              {e.name} <span className="text-grau">{e.anzahl}×</span>
            </span>
          ))}
        </div>
      )}
    </Karte>
  )
}
