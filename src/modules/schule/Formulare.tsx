// Die Eingabe-Fenster für den Bereich Schule: Fach, Note, Klausur, Hausaufgabe.
import { useEffect, useState } from 'react'
import { db, type Fach, type NotenArt } from '../../core/db'
import { heute, neueId, tagPlus } from '../../core/datum'
import Sheet from '../../core/ui/Sheet'
import { Chips, Eingabe, Knopf, Label } from '../../core/ui/Formular'
import { FACH_FARBEN } from './farben'
import { notenText, punkteFarbe } from './noten'

const FARBE = '#ff9f0a'
const ARTEN: NotenArt[] = ['Klausur', 'Mündlich', 'Test', 'Sonstiges']

interface FormProps {
  offen: boolean
  onZu: () => void
}

export function FachFormular({ offen, onZu }: FormProps) {
  const [name, setName] = useState('')
  const [farbe, setFarbe] = useState(FACH_FARBEN[0])

  async function speichern() {
    if (!name.trim()) return
    await db.faecher.add({ id: neueId(), name: name.trim(), farbe })
    setName('')
    onZu()
  }

  return (
    <Sheet titel="Neues Fach" offen={offen} onZu={onZu}>
      <div className="mb-4">
        <Eingabe label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Mathe" autoFocus />
      </div>
      <Label>Farbe</Label>
      <div className="mb-5 flex flex-wrap gap-3">
        {FACH_FARBEN.map((f) => (
          <button
            key={f}
            onClick={() => setFarbe(f)}
            className="tippbar h-10 w-10 rounded-full"
            style={{ background: f, outline: farbe === f ? '3px solid white' : 'none', outlineOffset: 2 }}
            aria-label={`Farbe ${f}`}
          />
        ))}
      </div>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!name.trim()}>
        Fach anlegen
      </Knopf>
    </Sheet>
  )
}

export function NoteFormular({ offen, onZu, faecher, startFach }: FormProps & { faecher: Fach[]; startFach?: string }) {
  const [fachId, setFachId] = useState(startFach ?? faecher[0]?.id ?? '')
  const [punkte, setPunkte] = useState(10)
  const [art, setArt] = useState<NotenArt>('Klausur')
  const [gewicht, setGewicht] = useState(2)
  const [datum, setDatum] = useState(heute())

  // Wenn das Fenster für ein bestimmtes Fach geöffnet wird, dieses Fach vorauswählen
  useEffect(() => {
    if (offen) setFachId(startFach ?? faecher[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen zurücksetzen
  }, [offen, startFach])

  // Praktisch: Klausuren zählen meist doppelt, alles andere einfach
  function waehleArt(a: NotenArt) {
    setArt(a)
    setGewicht(a === 'Klausur' ? 2 : 1)
  }

  async function speichern() {
    if (!fachId) return
    await db.noten.add({ id: neueId(), fachId, punkte, art, gewicht, datum })
    onZu()
  }

  return (
    <Sheet titel="Note eintragen" offen={offen} onZu={onZu}>
      <Label>Fach</Label>
      <div className="mb-4 flex flex-wrap gap-2">
        {faecher.map((f) => (
          <button
            key={f.id}
            onClick={() => setFachId(f.id)}
            className="tippbar min-h-11 rounded-full px-4 text-[15px] font-medium"
            style={{ background: fachId === f.id ? f.farbe : '#2c2c2e', color: fachId === f.id ? '#000' : '#fff' }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Punkte: 16 Knöpfe von 0 bis 15, ein Tap genügt */}
      <Label>
        Punkte: <b style={{ color: punkteFarbe(punkte) }}>{punkte}</b> (Note {notenText(punkte)})
      </Label>
      <div className="mb-4 grid grid-cols-8 gap-1.5">
        {Array.from({ length: 16 }, (_, i) => 15 - i).map((p) => (
          <button
            key={p}
            onClick={() => setPunkte(p)}
            className="tippbar h-11 rounded-xl text-[16px] font-semibold"
            style={{ background: punkte === p ? punkteFarbe(p) : '#2c2c2e', color: punkte === p ? '#000' : '#fff' }}
          >
            {p}
          </button>
        ))}
      </div>

      <Label>Art</Label>
      <div className="mb-4">
        <Chips optionen={ARTEN} wert={art} onWahl={waehleArt} farbe={FARBE} />
      </div>

      <div className="mb-5 flex gap-3">
        <div className="flex-1">
          <Label>Gewichtung: ×{gewicht}</Label>
          <div className="flex gap-1.5">
            {[0.5, 1, 2, 3].map((g) => (
              <button
                key={g}
                onClick={() => setGewicht(g)}
                className="tippbar h-12 flex-1 rounded-xl text-[15px] font-semibold"
                style={{ background: gewicht === g ? FARBE : '#2c2c2e', color: gewicht === g ? '#000' : '#fff' }}
              >
                {String(g).replace('.', ',')}
              </button>
            ))}
          </div>
        </div>
        <div className="w-36">
          <Eingabe label="Datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
      </div>

      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!fachId}>
        Speichern
      </Knopf>
    </Sheet>
  )
}

/** Gemeinsames Formular für Klausur-Termine und Hausaufgaben (beide: Titel, Fach, Datum). */
export function TerminFormular({ offen, onZu, faecher, typ }: FormProps & { faecher: Fach[]; typ: 'klausur' | 'hausaufgabe' }) {
  const [titel, setTitel] = useState('')
  const [fachId, setFachId] = useState<string | undefined>(undefined)
  const [datum, setDatum] = useState(tagPlus(heute(), 1))

  async function speichern() {
    if (!titel.trim()) return
    if (typ === 'klausur') await db.klausuren.add({ id: neueId(), titel: titel.trim(), fachId, datum })
    else await db.hausaufgaben.add({ id: neueId(), titel: titel.trim(), fachId, faellig: datum, erledigt: false })
    setTitel('')
    onZu()
  }

  return (
    <Sheet titel={typ === 'klausur' ? 'Klausur eintragen' : 'Hausaufgabe eintragen'} offen={offen} onZu={onZu}>
      <div className="mb-4">
        <Eingabe
          label={typ === 'klausur' ? 'Thema' : 'Was ist zu tun?'}
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={typ === 'klausur' ? 'z. B. Analysis' : 'z. B. S. 42 Nr. 3'}
          autoFocus
        />
      </div>
      {faecher.length > 0 && (
        <>
          <Label>Fach (optional)</Label>
          <div className="mb-4 flex flex-wrap gap-2">
            {faecher.map((f) => (
              <button
                key={f.id}
                onClick={() => setFachId(fachId === f.id ? undefined : f.id)}
                className="tippbar min-h-11 rounded-full px-4 text-[15px] font-medium"
                style={{ background: fachId === f.id ? f.farbe : '#2c2c2e', color: fachId === f.id ? '#000' : '#fff' }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mb-5">
        <Eingabe label={typ === 'klausur' ? 'Datum' : 'Fällig am'} type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
      </div>
      <Knopf farbe={FARBE} onClick={speichern} deaktiviert={!titel.trim()}>
        Speichern
      </Knopf>
    </Sheet>
  )
}
