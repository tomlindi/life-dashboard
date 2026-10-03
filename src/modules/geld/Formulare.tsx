// Eingabe-Fenster für Buchungen (Einnahme/Ausgabe) und Sparziele.
import { useEffect, useState } from 'react'
import { db } from '../../core/db'
import { heute, neueId } from '../../core/datum'
import Sheet from '../../core/ui/Sheet'
import { Chips, Eingabe, Knopf, Label } from '../../core/ui/Formular'

export const KATEGORIEN_AUSGABE = ['Essen', 'Freizeit', 'Kleidung', 'Handy', 'Schule', 'Transport', 'Geschenke', 'Sonstiges'] as const
export const KATEGORIEN_EINNAHME = ['Taschengeld', 'Job', 'Geschenk', 'Sonstiges'] as const

/** "12,50" oder "12.5" -> 12.5 (oder NaN, wenn keine Zahl) */
export const leseBetrag = (s: string) => parseFloat(s.replace(/\s|€/g, '').replace(',', '.'))

export function BuchungFormular({ art, onZu }: { art: 'einnahme' | 'ausgabe' | null; onZu: () => void }) {
  const [betrag, setBetrag] = useState('')
  const [kategorie, setKategorie] = useState<string>('Essen')
  const [notiz, setNotiz] = useState('')
  const [datum, setDatum] = useState(heute())
  const farbe = art === 'einnahme' ? '#30d158' : '#ff453a'
  const kategorien: readonly string[] = art === 'einnahme' ? KATEGORIEN_EINNAHME : KATEGORIEN_AUSGABE

  // Beim Öffnen: passende Standard-Kategorie wählen und Felder leeren
  useEffect(() => {
    if (art) {
      setKategorie(art === 'einnahme' ? 'Taschengeld' : 'Essen')
      setBetrag('')
      setNotiz('')
      setDatum(heute())
    }
  }, [art])

  const zahl = leseBetrag(betrag)
  const gueltig = Number.isFinite(zahl) && zahl > 0

  async function speichern() {
    if (!art || !gueltig) return
    await db.buchungen.add({ id: neueId(), datum, art, betrag: Math.round(zahl * 100) / 100, kategorie, notiz: notiz.trim() || undefined })
    onZu()
  }

  return (
    <Sheet titel={art === 'einnahme' ? 'Einnahme' : 'Ausgabe'} offen={art !== null} onZu={onZu}>
      {/* Großes Betragsfeld; inputMode="decimal" öffnet auf dem iPhone die Zahlentastatur */}
      <label className="mb-4 block">
        <span className="mb-1.5 block text-[13px] text-grau">Betrag</span>
        <div className="flex items-center rounded-2xl bg-karte2 px-4">
          <input
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            autoFocus
            className="h-16 min-w-0 flex-1 bg-transparent text-[32px] font-bold outline-none placeholder:text-grau"
            style={{ color: farbe, fontSize: 32 }}
          />
          <span className="text-[24px] text-grau">€</span>
        </div>
      </label>
      <Label>Kategorie</Label>
      <div className="mb-4">
        <Chips optionen={kategorien} wert={kategorie} onWahl={setKategorie} farbe={farbe} />
      </div>
      <div className="mb-5 flex gap-3">
        <Eingabe label="Notiz (optional)" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. Kino" />
        <div className="w-36">
          <Eingabe label="Datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
      </div>
      <Knopf farbe={farbe} onClick={speichern} deaktiviert={!gueltig}>
        Speichern
      </Knopf>
    </Sheet>
  )
}

export function SparzielFormular({ offen, onZu }: { offen: boolean; onZu: () => void }) {
  const [name, setName] = useState('')
  const [ziel, setZiel] = useState('')
  const zahl = leseBetrag(ziel)
  const gueltig = name.trim() !== '' && Number.isFinite(zahl) && zahl > 0

  async function speichern() {
    if (!gueltig) return
    await db.sparziele.add({ id: neueId(), name: name.trim(), ziel: zahl, gespart: 0 })
    setName('')
    setZiel('')
    onZu()
  }

  return (
    <Sheet titel="Neues Sparziel" offen={offen} onZu={onZu}>
      <div className="mb-5 flex flex-col gap-4">
        <Eingabe label="Wofür?" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Neue Kopfhörer" autoFocus />
        <Eingabe label="Zielbetrag (€)" value={ziel} onChange={(e) => setZiel(e.target.value)} inputMode="decimal" placeholder="z. B. 150" />
      </div>
      <Knopf farbe="#64d2ff" onClick={speichern} deaktiviert={!gueltig}>
        Anlegen
      </Knopf>
    </Sheet>
  )
}
