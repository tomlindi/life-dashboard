// Mahlzeit per Foto analysieren oder bearbeiten.
// Mit Foto + API-Schlüssel füllt Gemini das Formular aus. Du kannst alles ändern, bevor du speicherst.
// Ohne Schlüssel oder ohne Internet bleibt das Formular einfach leer zum Selbst-Ausfüllen.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { db, type Bewertung, type Mahlzeit, type Naehrwerte } from '../../core/db'
import { neueId } from '../../core/datum'
import { analysiereMahlzeit, holeSchluessel, verkleinere } from '../../core/gemini'
import Sheet from '../../core/ui/Sheet'
import { Eingabe, Label } from '../../core/ui/Formular'
import { BEWERTUNG } from './bewertung'

const FARBE = '#a3e635'
const NAEHRWERT_FELDER: { key: keyof Naehrwerte; label: string; einheit: string }[] = [
  { key: 'kcal', label: 'Energie', einheit: 'kcal' },
  { key: 'eiweiss', label: 'Eiweiß', einheit: 'g' },
  { key: 'kohlenhydrate', label: 'Kohlenh.', einheit: 'g' },
  { key: 'fett', label: 'Fett', einheit: 'g' },
  { key: 'zucker', label: 'Zucker', einheit: 'g' },
  { key: 'ballaststoffe', label: 'Ballastst.', einheit: 'g' },
]

interface Props {
  offen: boolean
  onZu: () => void
  tag: string
  foto?: File // neues Foto -> wird analysiert
  vorhanden?: Mahlzeit // bestehende Mahlzeit bearbeiten
}

export default function MahlzeitSheet({ offen, onZu, tag, foto, vorhanden }: Props) {
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState('')
  const [bild, setBild] = useState<string | undefined>()
  const [name, setName] = useState('')
  const [bewertung, setBewertung] = useState<Bewertung>('okay')
  const [tipp, setTipp] = useState('')
  const [portion, setPortion] = useState('')
  const [werte, setWerte] = useState<Record<string, string>>({})
  const [ausFoto, setAusFoto] = useState(false)
  const anfrage = useRef(0) // verhindert, dass eine alte Antwort ein neues Formular überschreibt

  const hatSchluessel = !!holeSchluessel()

  /** Foto an Gemini schicken und das Formular mit dem Ergebnis füllen. */
  async function analysiere(datei: File | string) {
    const nr = ++anfrage.current
    setLaedt(true)
    setFehler('')
    try {
      const ergebnis = await analysiereMahlzeit(await verkleinere(datei, 1024, 0.8))
      if (nr !== anfrage.current) return
      if (!ergebnis.erkannt) setFehler('Auf dem Foto wurde kein Essen erkannt. Du kannst die Mahlzeit trotzdem von Hand eintragen.')
      setName(ergebnis.erkannt ? ergebnis.name : '')
      setBewertung(ergebnis.bewertung)
      setTipp(ergebnis.tipp)
      setPortion(ergebnis.portion)
      setWerte(Object.fromEntries(Object.entries(ergebnis.naehrwerte).map(([k, v]) => [k, v === undefined ? '' : String(v)])))
    } catch (e) {
      if (nr === anfrage.current) setFehler((e as Error).message)
    }
    if (nr === anfrage.current) setLaedt(false)
  }

  // Beim Öffnen: bestehende Mahlzeit laden ODER neues Foto vorbereiten und analysieren
  useEffect(() => {
    if (!offen) return
    anfrage.current++
    setFehler('')
    setLaedt(false)
    const v = vorhanden
    setName(v?.name ?? '')
    setBewertung(v?.bewertung ?? 'okay')
    setTipp(v?.tipp ?? '')
    setPortion(v?.portion ?? '')
    setWerte(Object.fromEntries(NAEHRWERT_FELDER.map((f) => [f.key, v?.naehrwerte?.[f.key]?.toString() ?? ''])))
    setBild(v?.bild)
    setAusFoto(v?.quelle === 'foto')
    if (foto && !v) {
      setAusFoto(true)
      // Kleines Vorschaubild zum Speichern (ca. 20 KB), großes Bild nur für die Analyse
      verkleinere(foto, 320, 0.7)
        .then((b) => setBild(b.dataUrl))
        .catch(() => setFehler('Das Foto konnte nicht gelesen werden.'))
      if (hatSchluessel) analysiere(foto)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, [offen, foto, vorhanden])

  async function speichern() {
    if (!name.trim()) return
    const naehrwerte: Naehrwerte = {}
    for (const f of NAEHRWERT_FELDER) {
      const n = parseFloat((werte[f.key] ?? '').replace(',', '.'))
      if (Number.isFinite(n) && n >= 0) naehrwerte[f.key] = Math.round(n)
    }
    await db.mahlzeiten.put({
      id: vorhanden?.id ?? neueId(),
      datum: vorhanden?.datum ?? tag,
      name: name.trim(),
      bewertung,
      tipp: tipp.trim() || undefined,
      portion: portion.trim() || undefined,
      naehrwerte: Object.keys(naehrwerte).length ? naehrwerte : undefined,
      bild,
      quelle: ausFoto ? 'foto' : 'manuell',
    })
    onZu()
  }

  return (
    <Sheet titel={vorhanden ? 'Mahlzeit bearbeiten' : 'Foto-Analyse'} offen={offen} onZu={onZu}>
      {bild && (
        <div className="relative mb-4 overflow-hidden rounded-2xl">
          <img src={bild} alt="Foto der Mahlzeit" className="max-h-56 w-full object-cover" />
          {laedt && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-[15px] font-semibold">
              <Loader2 size={28} className="animate-spin" />
              Gemini analysiert …
            </div>
          )}
        </div>
      )}

      {!hatSchluessel && ausFoto && !vorhanden && (
        <p className="mb-4 rounded-2xl bg-karte2 p-3 text-[14px] leading-snug text-grau">
          Für die automatische Analyse brauchst du einen kostenlosen Gemini-Schlüssel:{' '}
          <Link to="/einstellungen" onClick={onZu} className="font-semibold" style={{ color: FARBE }}>
            Mehr → Einstellungen
          </Link>
          . Bis dahin kannst du die Mahlzeit hier von Hand eintragen.
        </p>
      )}
      {fehler && <p className="mb-4 rounded-2xl bg-[#ff453a]/15 p-3 text-[14px] leading-snug">⚠️ {fehler}</p>}

      <div className={laedt ? 'pointer-events-none opacity-40' : ''}>
        <div className="mb-4">
          <Eingabe label="Gericht" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Hähnchen mit Reis" />
        </div>

        <Label>Bewertung</Label>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(Object.keys(BEWERTUNG) as Bewertung[]).map((b) => (
            <button
              key={b}
              onClick={() => setBewertung(b)}
              className="tippbar flex h-14 items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold capitalize"
              style={{ background: bewertung === b ? BEWERTUNG[b].farbe : BEWERTUNG[b].farbe + '22', color: bewertung === b ? '#000' : BEWERTUNG[b].farbe }}
            >
              <span className="text-[20px]">{BEWERTUNG[b].emoji}</span> {b}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <Eingabe label="Portion (optional)" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="z. B. 1 Teller, ca. 400 g" />
        </div>

        <Label>Geschätzte Nährwerte {ausFoto && '(von Gemini geschätzt, gerne anpassen)'}</Label>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {NAEHRWERT_FELDER.map((f) => (
            <label key={f.key} className="rounded-xl bg-karte2 px-2 py-1.5 text-center">
              <span className="block text-[11px] text-grau">{f.label}</span>
              <span className="flex items-baseline justify-center gap-0.5">
                <input
                  value={werte[f.key] ?? ''}
                  onChange={(e) => setWerte({ ...werte, [f.key]: e.target.value })}
                  inputMode="numeric"
                  placeholder="–"
                  className="w-14 bg-transparent text-center text-[17px] font-semibold outline-none placeholder:text-grau"
                />
                <span className="text-[11px] text-grau">{f.einheit}</span>
              </span>
            </label>
          ))}
        </div>

        <Label>
          <span className="inline-flex items-center gap-1">
            <Sparkles size={13} /> Tipp
          </span>
        </Label>
        <textarea value={tipp} onChange={(e) => setTipp(e.target.value)} rows={2} placeholder="z. B. Noch etwas Gemüse dazu" className="mb-5 w-full resize-none rounded-2xl bg-karte2 p-3 outline-none placeholder:text-grau" />
      </div>

      <div className="flex gap-2">
        {vorhanden ? (
          <button
            onClick={async () => {
              if (!confirm('Mahlzeit löschen?')) return
              await db.mahlzeiten.delete(vorhanden.id)
              onZu()
            }}
            className="tippbar h-14 rounded-2xl bg-karte2 px-5 text-[16px] text-[#ff453a]"
          >
            Löschen
          </button>
        ) : (
          foto &&
          hatSchluessel && (
            <button onClick={() => analysiere(foto)} disabled={laedt} className="tippbar flex h-14 items-center gap-1.5 rounded-2xl bg-karte2 px-4 text-[15px] disabled:opacity-40" aria-label="Erneut analysieren">
              <RefreshCw size={18} /> Neu
            </button>
          )
        )}
        <button
          onClick={speichern}
          disabled={!name.trim() || laedt}
          className="tippbar h-14 flex-1 rounded-2xl text-[17px] font-semibold text-black disabled:opacity-40"
          style={{ background: FARBE }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}
