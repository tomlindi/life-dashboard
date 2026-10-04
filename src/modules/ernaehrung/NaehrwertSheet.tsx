// Fenster zum Prüfen und Speichern einer Mahlzeit mit Nährwerten.
// Es öffnet sich nach der Foto-Analyse (vorausgefüllt mit der Schätzung der KI), über "Nährwerte von Hand"
// oder beim Antippen einer Mahlzeit in der Liste "Heute" (zum Bearbeiten oder Ergänzen).
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { db, type Bewertung, type Mahlzeit } from '../../core/db'
import { heute, neueId } from '../../core/datum'
import { analysiereMahlzeit, type Sicherheit } from '../../core/ki'
import Sheet from '../../core/ui/Sheet'
import { Knopf, Label } from '../../core/ui/Formular'
import { BEWERTUNG, FARBE, NAEHRWERTE, alsText, alsZahl, type Naehrwert } from './naehrwerte'

/** Alles, womit das Fenster startet. */
export interface Entwurf {
  id?: string // gesetzt = vorhandene Mahlzeit bearbeiten
  nr?: string // nur fürs Fenster: jeder neu geöffnete Entwurf bekommt eine eigene Nummer (siehe unten)
  name: string
  bewertung: Bewertung
  kcal?: number
  protein?: number
  kohlenhydrate?: number
  fett?: number
  quelle: 'ki' | 'manuell'
  bild?: string // Vorschaubild (wird mitgespeichert)
  foto?: string // Foto in voller Größe als Base64 – nur im Arbeitsspeicher, für "Neu berechnen"
  sicherheit?: Sicherheit
  erklaerung?: string
  tipp?: string
}

/** Macht aus einer gespeicherten Mahlzeit einen Entwurf zum Bearbeiten. */
export const entwurfVon = (m: Mahlzeit): Entwurf => ({ ...m, quelle: m.quelle ?? 'manuell' })

export default function NaehrwertSheet({ entwurf, onZu }: { entwurf: Entwurf | null; onZu: () => void }) {
  const titel = entwurf?.id ? 'Mahlzeit bearbeiten' : entwurf?.quelle === 'ki' ? 'Mahlzeit prüfen' : 'Nährwerte eintragen'
  return (
    <Sheet titel={titel} offen={!!entwurf} onZu={onZu}>
      {/* key: Bei jedem neuen Entwurf wird das Formular neu aufgebaut und startet mit dessen Werten –
          auch wenn das Fenster dabei offen bleibt (z. B. wartet ein KI-Ergebnis, bis die vorige Mahlzeit fertig ist).
          Ohne key blieben die alten Eingaben stehen und würden unter dem neuen Entwurf gespeichert. */}
      {entwurf && <Formular key={entwurf.nr} entwurf={entwurf} onZu={onZu} />}
    </Sheet>
  )
}

function Formular({ entwurf, onZu }: { entwurf: Entwurf; onZu: () => void }) {
  const [name, setName] = useState(entwurf.name)
  const [werte, setWerte] = useState<Record<Naehrwert, string>>({
    kcal: alsText(entwurf.kcal),
    protein: alsText(entwurf.protein),
    kohlenhydrate: alsText(entwurf.kohlenhydrate),
    fett: alsText(entwurf.fett),
  })
  const [bewertung, setBewertung] = useState(entwurf.bewertung)
  const [info, setInfo] = useState({ sicherheit: entwurf.sicherheit, erklaerung: entwurf.erklaerung })
  const [tipp, setTipp] = useState(entwurf.tipp ?? '')
  const [hinweis, setHinweis] = useState('')
  const [rechnet, setRechnet] = useState(false)
  const [fehler, setFehler] = useState('')

  /** Gleiches Foto nochmal an die KI schicken, diesmal mit dem Hinweis. */
  async function neuBerechnen() {
    if (!entwurf.foto || rechnet) return
    setRechnet(true)
    setFehler('')
    try {
      const e = await analysiereMahlzeit(entwurf.foto, hinweis)
      if (!e.name) throw new Error('Auf dem Foto ist kein Essen zu erkennen. Beschreib im Hinweis, was es ist.')
      setName(e.name)
      setWerte({ kcal: alsText(e.kcal), protein: alsText(e.protein), kohlenhydrate: alsText(e.kohlenhydrate), fett: alsText(e.fett) })
      setBewertung(e.bewertung)
      setInfo({ sicherheit: e.sicherheit, erklaerung: e.erklaerung })
      setTipp(e.tipp)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Unbekannter Fehler.')
    } finally {
      setRechnet(false)
    }
  }

  async function speichern() {
    const zahlen = {} as Record<Naehrwert, number | undefined>
    for (const { key, name: n } of NAEHRWERTE) {
      zahlen[key] = alsZahl(werte[key])
      if (werte[key].trim() && zahlen[key] === undefined) return setFehler(`Bei „${n}“ bitte nur eine Zahl eintragen.`)
    }
    const mitWerten = Object.values(zahlen).some((z) => z !== undefined)
    const daten = {
      name: name.trim() || 'Mahlzeit',
      bewertung,
      ...zahlen,
      bild: entwurf.bild,
      tipp: tipp.trim() || undefined,
      quelle: mitWerten ? entwurf.quelle : undefined,
    }
    // Beim Bearbeiten löscht Dexie Felder, die auf undefined stehen (z. B. ein geleertes Feld).
    if (entwurf.id) await db.mahlzeiten.update(entwurf.id, daten)
    else await db.mahlzeiten.add({ id: neueId(), datum: heute(), ...daten })
    onZu()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        {entwurf.bild && <img src={entwurf.bild} alt="" className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover" />}
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-[13px] text-grau">Was war es?</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Spaghetti Bolognese"
            className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
          />
        </label>
      </div>

      {/* Woher die Schätzung kommt (nur bei der KI) */}
      {info.erklaerung && (
        <p className="-mt-1 text-[13px] leading-snug text-grau">
          ✨ KI-Schätzung · Sicherheit: {info.sicherheit ?? 'mittel'}. {info.erklaerung}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
        {NAEHRWERTE.map((n) => (
          <label key={n.key} className="block min-w-0">
            <span className="mb-1.5 flex items-center gap-1.5 text-[13px] text-grau">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.farbe }} />
              {n.name} ({n.einheit})
            </span>
            <input
              value={werte[n.key]}
              onChange={(e) => setWerte({ ...werte, [n.key]: e.target.value })}
              inputMode="decimal"
              placeholder="–"
              className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
            />
          </label>
        ))}
      </div>

      <div>
        <Label>Wie war’s?</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BEWERTUNG) as Bewertung[]).map((b) => {
            const gewaehlt = bewertung === b
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBewertung(b)}
                className="tippbar flex h-11 min-w-0 items-center justify-center gap-1 rounded-full px-1 text-[14px] font-semibold capitalize"
                style={{ background: gewaehlt ? BEWERTUNG[b].farbe : BEWERTUNG[b].farbe + '26', color: gewaehlt ? '#000' : BEWERTUNG[b].farbe }}
              >
                <span>{BEWERTUNG[b].emoji}</span>
                {b}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tipp (von der KI vorgeschlagen, frei änderbar) */}
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-grau">💡 Tipp</span>
        <textarea
          value={tipp}
          onChange={(e) => setTipp(e.target.value)}
          rows={2}
          placeholder="z. B. Noch etwas Gemüse dazu"
          className="w-full resize-none rounded-2xl bg-karte2 p-3 outline-none placeholder:text-grau"
        />
      </label>

      {/* Nochmal rechnen lassen, z. B. "nur die Hälfte gegessen" (nur solange das Foto noch da ist) */}
      {entwurf.foto && (
        <div>
          <Label>Stimmt was nicht? Gib der KI einen Hinweis:</Label>
          <div className="flex gap-2">
            <input
              value={hinweis}
              onChange={(e) => setHinweis(e.target.value)}
              placeholder="z. B. halbe Portion"
              className="h-12 min-w-0 flex-1 rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
            />
            <button
              type="button"
              onClick={neuBerechnen}
              disabled={rechnet}
              className="tippbar flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-karte2 px-3 text-[15px] font-semibold disabled:opacity-60"
              style={{ color: FARBE }}
            >
              <RefreshCw size={16} className={rechnet ? 'animate-spin' : ''} />
              {rechnet ? 'Rechne…' : 'Neu berechnen'}
            </button>
          </div>
        </div>
      )}

      {fehler && <p className="text-[14px] leading-snug text-[#ff453a]">{fehler}</p>}

      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={rechnet}>
        Speichern
      </Knopf>
    </div>
  )
}
