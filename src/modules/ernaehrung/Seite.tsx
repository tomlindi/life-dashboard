// Bereich "Ernährung". Von oben nach unten:
// 1. Nährwert-Ringe für heute (Kalorien, Protein, Kohlenhydrate, Fett) mit einstellbaren Tageszielen
// 2. Essenskalender (Monat, aufklappbar zum Jahr; pro Mahlzeit ein Farbstreifen)
// 3. Mahlzeit eintragen: per Foto (die KI schätzt die Nährwerte), von Hand oder schnell nur mit Bewertung
// 4. Heute: die Mahlzeiten von heute (antippen zum Bearbeiten / Nährwerte ergänzen)
// 5. Wasser (Tag + Woche, Health ersetzt den Zähler) und Alkohol (nur aus Health)
// Kalorien und Makros kommen aus Apple Health, falls vorhanden; sonst aus den geschätzten Mahlzeiten.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Bewertung } from '../../core/db'
import { heute, neueId } from '../../core/datum'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import { Leer, LoeschKnopf } from '../../core/ui/Formular'
import NaehrwertRinge from './NaehrwertRinge'
import ErnaehrungKalender from './Kalender'
import MakroVerlauf from './MakroVerlauf'
import FotoErfassung from './FotoErfassung'
import NaehrwertSheet, { entwurfVon, type Entwurf } from './NaehrwertSheet'
import { BEWERTUNG, FARBE, hatNaehrwerte, kurzText } from './naehrwerte'
import { WASSER_ZIEL_GLAESER, WasserUndAlkohol, useHealthNaehrwerte } from './health'

const VORSCHLAEGE = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

export default function ErnaehrungSeite() {
  const tag = heute()
  const mahlzeiten = useLiveQuery(() => db.mahlzeiten.toArray(), []) ?? []
  const [name, setName] = useState('')
  // Prüf-/Bearbeiten-Fenster als Warteschlange: das erste ist offen, leer = zu.
  // Die Foto-Analyse dauert oft 10–30 s. Kommt ihr Ergebnis, während gerade eine andere Mahlzeit
  // offen ist, wartet es dahinter – so gehen weder deine Eingaben noch das (bezahlte) KI-Ergebnis verloren.
  const [fenster, setFenster] = useState<Entwurf[]>([])
  const oeffne = (e: Entwurf) => setFenster((f) => [...f, { ...e, nr: neueId() }])

  const heutige = mahlzeiten.filter((m) => m.datum === tag)
  const healthNaehrwerte = useHealthNaehrwerte() // Kalorien + Makros aus Apple Health, pro Tag

  /** Ein Tap auf eine Bewertung speichert die Mahlzeit sofort (ohne Nährwerte). */
  async function speichere(bewertung: Bewertung) {
    await db.mahlzeiten.add({ id: neueId(), datum: tag, name: name.trim() || 'Mahlzeit', bewertung })
    setName('')
  }

  return (
    <Seite titel="Ernährung" farbe={FARBE}>
      <NaehrwertRinge mahlzeiten={heutige} health={healthNaehrwerte.get(tag)} />

      <MakroVerlauf mahlzeiten={mahlzeiten} health={healthNaehrwerte} />

      <ErnaehrungKalender mahlzeiten={mahlzeiten} />

      {/* Mahlzeit eintragen */}
      <Karte titel="Mahlzeit eintragen" akzent={FARBE}>
        <FotoErfassung onEntwurf={oeffne} />

        <p className="mb-2 border-t border-linie pt-3 text-[13px] text-grau">Oder schnell ohne Nährwerte:</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Was hast du gegessen? (optional)"
          className="mb-2 h-12 w-full rounded-2xl bg-karte2 px-4 outline-none placeholder:text-grau"
        />
        <div className="mb-3 flex flex-wrap gap-2">
          {VORSCHLAEGE.map((v) => (
            <button key={v} onClick={() => setName(v)} className="tippbar min-h-9 rounded-full bg-karte2 px-3 text-[14px]" style={{ color: name === v ? FARBE : '#fff' }}>
              {v}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[13px] text-grau">Wie war’s? (ein Tap speichert)</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BEWERTUNG) as Bewertung[]).map((b) => (
            <button
              key={b}
              onClick={() => speichere(b)}
              className="tippbar flex h-20 flex-col items-center justify-center gap-1 rounded-2xl"
              style={{ background: BEWERTUNG[b].farbe + '26' }}
            >
              <span className="text-[28px]">{BEWERTUNG[b].emoji}</span>
              <span className="text-[14px] font-semibold capitalize" style={{ color: BEWERTUNG[b].farbe }}>
                {b}
              </span>
            </button>
          ))}
        </div>
      </Karte>

      {/* Heute: Foto (oder Emoji in der Farbe der Bewertung), Name, Nährwerte in Grau */}
      <Karte titel="Heute">
        {heutige.length === 0 ? (
          <Leer>Heute noch nichts eingetragen.</Leer>
        ) : (
          <ul className="flex flex-col gap-1">
            {heutige.map((m) => (
              <li key={m.id} className="flex min-h-14 items-center gap-1">
                <button onClick={() => oeffne(entwurfVon(m))} className="tippbar flex min-w-0 flex-1 items-center gap-3 text-left">
                  {m.bild ? (
                    <img
                      src={m.bild}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      style={{ outline: `2px solid ${BEWERTUNG[m.bewertung].farbe}`, outlineOffset: -2 }}
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px]" style={{ background: BEWERTUNG[m.bewertung].farbe + '26' }}>
                      {BEWERTUNG[m.bewertung].emoji}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px]">{m.name}</span>
                    <span className="block truncate text-[13px] text-grau">
                      {hatNaehrwerte(m) ? (
                        kurzText(m)
                      ) : (
                        <>
                          <span style={{ color: BEWERTUNG[m.bewertung].farbe }}>{m.bewertung}</span> · ohne Nährwerte
                        </>
                      )}
                    </span>
                    {/* Tipp der KI (oder selbst geschrieben) */}
                    {m.tipp && <span className="block truncate text-[12px] text-grau">💡 {m.tipp}</span>}
                  </span>
                </button>
                <LoeschKnopf frage="Mahlzeit löschen?" onLoeschen={() => db.mahlzeiten.delete(m.id)} />
              </li>
            ))}
          </ul>
        )}
      </Karte>

      {/* Wasser und Alkohol (Health ersetzt die gezählten Gläser für den Tag) */}
      <WasserUndAlkohol zielGlaeser={WASSER_ZIEL_GLAESER} />

      <NaehrwertSheet entwurf={fenster[0] ?? null} onZu={() => setFenster((f) => f.slice(1))} />
    </Seite>
  )
}
