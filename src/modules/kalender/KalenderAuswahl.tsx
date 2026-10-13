// Blatt "Kalender" (wie in Apple Kalender): alle Kalender ein- oder ausblenden und ihre Farbe ändern.
//   • Zeile antippen  -> Kalender ein-/ausblenden (Haken rechts)
//   • Kreis antippen  -> die 12 Apple-Farben aufklappen
// Ausgeblendete Kalender verschwinden aus Monatsansicht, Tagesliste, Legende, Heute-Widget und Fitness.
import { useState } from 'react'
import { Check } from 'lucide-react'
import Sheet from '../../core/ui/Sheet'
import { Leer } from '../../core/ui/Formular'
import { ROT, setzeAusgeblendeteKalender, useKalenderFarben } from './farben'
import FarbAuswahl from './FarbAuswahl'

export default function KalenderAuswahl({ offen, onZu }: { offen: boolean; onZu: () => void }) {
  const { namen, ausgeblendet, farbe, sichtbar } = useKalenderFarben()
  const [farbeOffen, setFarbeOffen] = useState<string | null>(null)
  const alleSichtbar = namen.every((n) => sichtbar(n))

  const umschalten = (name: string) => setzeAusgeblendeteKalender(sichtbar(name) ? [...ausgeblendet, name] : ausgeblendet.filter((n) => n !== name))

  return (
    <Sheet titel="Kalender" offen={offen} onZu={onZu}>
      {namen.length === 0 ? (
        <Leer>Noch keine Kalender. Sie erscheinen hier nach dem ersten Life Sync.</Leer>
      ) : (
        <>
          <button
            onClick={() => setzeAusgeblendeteKalender(alleSichtbar ? namen : [])}
            className="tippbar mb-2 min-h-10 text-[16px] font-medium"
            style={{ color: ROT }}
          >
            {alleSichtbar ? 'Alle ausblenden' : 'Alle einblenden'}
          </button>
          <ul className="overflow-hidden rounded-2xl bg-karte2 px-3">
            {namen.map((name, i) => (
              <li key={name} className={i > 0 ? 'border-t border-linie' : ''}>
                <div className="flex min-h-12 items-center gap-3">
                  {/* Kreis: Farbe ändern */}
                  <button
                    onClick={() => setFarbeOffen(farbeOffen === name ? null : name)}
                    aria-label={`Farbe für ${name} ändern`}
                    className="tippbar flex h-10 w-10 shrink-0 items-center justify-center"
                  >
                    <span className="h-5 w-5 rounded-full" style={{ background: farbe(name) }} />
                  </button>
                  {/* Rest der Zeile: ein-/ausblenden */}
                  <button onClick={() => umschalten(name)} className="tippbar flex min-h-12 min-w-0 flex-1 items-center gap-2 text-left">
                    <span className={`flex-1 truncate text-[16px] ${sichtbar(name) ? '' : 'text-grau'}`}>{name}</span>
                    {sichtbar(name) && <Check size={20} color={ROT} strokeWidth={2.5} />}
                  </button>
                </div>
                {farbeOffen === name && <FarbAuswahl name={name} aktuell={farbe(name)} onFertig={() => setFarbeOffen(null)} />}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-snug text-grau">Ausgeblendete Kalender werden nur nicht angezeigt. Ihre Termine bleiben gespeichert und werden weiter mit Apple abgeglichen.</p>
        </>
      )}
    </Sheet>
  )
}
