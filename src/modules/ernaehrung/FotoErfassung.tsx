// Knopf "📷 Foto analysieren": Foto aufnehmen oder aus der Mediathek wählen → verkleinern → die KI schätzt
// die Nährwerte → das Prüf-Fenster (NaehrwertSheet) öffnet sich vorausgefüllt.
// Ohne KI (Gemini- oder Claude-Schlüssel) öffnet sich stattdessen zuerst "KI einrichten". Darunter: "Nährwerte von Hand".
import { useRef, useState, type ChangeEvent } from 'react'
import { LoaderCircle, PencilLine } from 'lucide-react'
import { analysiereMahlzeit, kiVerfuegbar } from '../../core/ki'
import { bereiteFotoVor } from './foto'
import KiEinrichten from './KiEinrichten'
import type { Entwurf } from './NaehrwertSheet'
import { FARBE } from './naehrwerte'

export default function FotoErfassung({ onEntwurf }: { onEntwurf: (e: Entwurf) => void }) {
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [schluessel, setSchluessel] = useState(kiVerfuegbar)
  // "foto" = nach dem Einrichten gleich die Kamera öffnen, "nur" = nur den Schlüssel ändern
  const [einrichten, setEinrichten] = useState<'aus' | 'foto' | 'nur'>('aus')
  // null = nichts läuft; sonst das Vorschaubild ('' solange das Foto noch verkleinert wird)
  const [analyse, setAnalyse] = useState<string | null>(null)
  const [fehler, setFehler] = useState('')

  function fotoKnopf() {
    setFehler('')
    if (!kiVerfuegbar()) return setEinrichten('foto')
    dateiFeld.current?.click()
  }

  async function fotoGewaehlt(e: ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0]
    e.target.value = '' // damit man dasselbe Foto auch nochmal wählen kann
    if (!datei) return
    setAnalyse('')
    try {
      const foto = await bereiteFotoVor(datei)
      setAnalyse(foto.vorschau)
      const ergebnis = await analysiereMahlzeit(foto.base64)
      if (!ergebnis.name) throw new Error('Auf dem Foto ist kein Essen zu erkennen. Versuch es mit einem anderen Foto oder trag die Werte von Hand ein.')
      onEntwurf({ ...ergebnis, quelle: 'ki', bild: foto.vorschau, foto: foto.base64 })
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler.')
    } finally {
      setAnalyse(null)
    }
  }

  return (
    <div className="mb-3">
      {/* Ohne "capture": so bietet das iPhone "Foto aufnehmen" UND "Fotomediathek" an */}
      <input ref={dateiFeld} type="file" accept="image/*" onChange={fotoGewaehlt} className="sr-only" tabIndex={-1} aria-hidden />
      <button
        type="button"
        onClick={fotoKnopf}
        disabled={analyse !== null}
        className="tippbar flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-black disabled:opacity-80"
        style={{ background: FARBE }}
      >
        {analyse === null ? (
          <>📷 Foto analysieren</>
        ) : (
          <>
            {analyse && <img src={analyse} alt="" className="h-9 w-9 rounded-lg object-cover" />}
            <LoaderCircle size={20} className="animate-spin" />
            Analysiere…
          </>
        )}
      </button>

      {fehler && <p className="mt-2 text-[14px] leading-snug whitespace-pre-line break-words text-[#ff453a]">{fehler}</p>}

      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onEntwurf({ name: '', bewertung: 'okay', quelle: 'manuell' })}
          disabled={analyse !== null} // während die KI rechnet, erst ihr Ergebnis abwarten
          className="tippbar flex min-h-10 items-center gap-1.5 text-[14px] font-semibold disabled:opacity-40"
          style={{ color: FARBE }}
        >
          <PencilLine size={15} /> Nährwerte von Hand
        </button>
        <button type="button" onClick={() => setEinrichten('nur')} disabled={analyse !== null} className="tippbar min-h-10 text-[14px] text-grau disabled:opacity-40">
          {schluessel ? 'KI-Einstellungen' : 'KI einrichten'}
        </button>
      </div>

      <KiEinrichten
        offen={einrichten !== 'aus'}
        onZu={() => {
          setEinrichten('aus')
          setSchluessel(kiVerfuegbar())
        }}
        onGespeichert={einrichten === 'foto' ? () => dateiFeld.current?.click() : undefined}
      />
    </div>
  )
}
