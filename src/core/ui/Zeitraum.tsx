// Zeitraum-Umschalter (1M · 3M · 6M · 1J · Alle) für Verlaufs-Diagramme, z. B. Gewicht, Schlaf, Gewohnheiten.
// Benutzung:
//   const [zeitraum, setZeitraum] = useState<ZeitraumLabel>('3M')
//   <ZeitraumWahl wert={zeitraum} onWahl={setZeitraum} />
//   const ab = zeitraumAb(zeitraum)   // "JJJJ-MM-TT" oder '' für "Alle"
import { heute, tagPlus } from '../datum'

export const ZEITRAEUME = [
  { label: '1M', tage: 30 },
  { label: '3M', tage: 91 },
  { label: '6M', tage: 182 },
  { label: '1J', tage: 365 },
  { label: 'Alle', tage: Infinity },
] as const

export type ZeitraumLabel = (typeof ZEITRAEUME)[number]['label']

/** Erster Tag des Zeitraums als "JJJJ-MM-TT", bei "Alle" ein leerer Text (alles ist >= ''). */
export function zeitraumAb(label: ZeitraumLabel): string {
  const tage = ZEITRAEUME.find((z) => z.label === label)!.tage
  return tage === Infinity ? '' : tagPlus(heute(), -tage)
}

export function ZeitraumWahl({ wert, onWahl }: { wert: ZeitraumLabel; onWahl: (z: ZeitraumLabel) => void }) {
  return (
    <div className="mb-3 flex gap-1 rounded-xl bg-karte2 p-1">
      {ZEITRAEUME.map((z) => (
        <button
          key={z.label}
          onClick={() => onWahl(z.label)}
          className="tippbar min-h-8 flex-1 rounded-lg text-[13px] font-semibold"
          style={{ background: wert === z.label ? '#636366' : 'transparent' }}
        >
          {z.label}
        </button>
      ))}
    </div>
  )
}
