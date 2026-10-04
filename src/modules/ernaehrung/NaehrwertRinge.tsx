// Karte "Nährwerte heute": vier Ringe wie in Apples Fitness-App – Kalorien, Protein, Kohlenhydrate, Fett.
// Jeder Ring zeigt, wie viel vom Tagesziel schon gegessen ist. Mahlzeiten ohne Nährwerte zählen als 0.
// Die Tagesziele lassen sich über "Ziele" ändern (gespeichert als Einstellung "ernaehrungZiele").
import { useState } from 'react'
import type { Mahlzeit } from '../../core/db'
import { useEinstellung } from '../../core/einstellungen'
import { zahl } from '../../core/format'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import Sheet from '../../core/ui/Sheet'
import { Knopf } from '../../core/ui/Formular'
import { FARBE, NAEHRWERTE, STANDARD_ZIELE, alsText, alsZahl, hatNaehrwerte, summe, type Naehrwert, type Naehrwerte } from './naehrwerte'

/** Tagesziele; fehlende Werte (z. B. aus einer älteren Version) kommen vom Standard. */
function useErnaehrungsZiele(): [Naehrwerte, (neu: Naehrwerte) => void] {
  const [gespeichert, setZiele] = useEinstellung<Partial<Naehrwerte>>('ernaehrungZiele', STANDARD_ZIELE)
  return [{ ...STANDARD_ZIELE, ...gespeichert }, setZiele]
}

export default function NaehrwertRinge({ mahlzeiten }: { mahlzeiten: Mahlzeit[] }) {
  const [ziele, setZiele] = useErnaehrungsZiele()
  const [zieleOffen, setZieleOffen] = useState(false)
  const gegessen = summe(mahlzeiten)
  const ohne = mahlzeiten.filter((m) => !hatNaehrwerte(m)).length

  return (
    <Karte
      titel="Nährwerte heute"
      akzent={FARBE}
      rechts={
        <button type="button" onClick={() => setZieleOffen(true)} className="tippbar -my-1 min-h-8 rounded-full bg-karte2 px-3 text-[13px] font-semibold">
          Ziele
        </button>
      }
    >
      {/* -mx-3: die Spalten nutzen auch den Kartenrand, damit "Kohlenhydrate" ganz hineinpasst */}
      <div className="-mx-3 grid grid-cols-4">
        {NAEHRWERTE.map((n) => (
          <div key={n.key} className="flex min-w-0 flex-col items-center">
            <Ring fortschritt={gegessen[n.key] / (ziele[n.key] || 1)} farbe={n.farbe} groesse={70} dicke={8}>
              <div className="leading-none">
                <p className="text-[15px] font-semibold">{zahl(gegessen[n.key], 0)}</p>
                <p className="mt-0.5 text-[10px] text-grau">{n.einheit}</p>
              </div>
            </Ring>
            <p className="mt-1.5 max-w-full truncate text-[12px] font-semibold tracking-tight" style={{ color: n.farbe }}>
              {n.name}
            </p>
            <p className="text-[11px] text-grau">von {zahl(ziele[n.key], 0)}</p>
          </div>
        ))}
      </div>
      {ohne > 0 && (
        <p className="mt-3 text-[13px] text-grau">{ohne === 1 ? '1 Mahlzeit' : `${ohne} Mahlzeiten`} ohne Nährwerte</p>
      )}

      <Sheet titel="Tagesziele" offen={zieleOffen} onZu={() => setZieleOffen(false)}>
        <ZieleFormular
          ziele={ziele}
          onSpeichern={(neu) => {
            setZiele(neu)
            setZieleOffen(false)
          }}
        />
      </Sheet>
    </Karte>
  )
}

function ZieleFormular({ ziele, onSpeichern }: { ziele: Naehrwerte; onSpeichern: (neu: Naehrwerte) => void }) {
  const [texte, setTexte] = useState<Record<Naehrwert, string>>({
    kcal: alsText(ziele.kcal),
    protein: alsText(ziele.protein),
    kohlenhydrate: alsText(ziele.kohlenhydrate),
    fett: alsText(ziele.fett),
  })

  function speichern() {
    // Leere oder ungültige Felder behalten das alte Ziel
    const neu = { ...ziele }
    for (const { key } of NAEHRWERTE) {
      const z = alsZahl(texte[key])
      if (z) neu[key] = z
    }
    onSpeichern(neu)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
        {NAEHRWERTE.map((n) => (
          <label key={n.key} className="block min-w-0">
            <span className="mb-1.5 flex items-center gap-1.5 text-[13px] text-grau">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.farbe }} />
              {n.name} ({n.einheit})
            </span>
            <input
              value={texte[n.key]}
              onChange={(e) => setTexte({ ...texte, [n.key]: e.target.value })}
              inputMode="decimal"
              className="h-12 w-full rounded-2xl bg-karte2 px-4 outline-none"
            />
          </label>
        ))}
      </div>
      <p className="text-[13px] leading-snug text-grau">
        Faustregel für Sportler: etwa 1,2–2 g Protein pro kg Körpergewicht. Wie viele Kalorien du brauchst, hängt stark von Größe, Gewicht und Training ab.
      </p>
      <Knopf farbe={FARBE} onClick={speichern}>
        Speichern
      </Knopf>
    </div>
  )
}
