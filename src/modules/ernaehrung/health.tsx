// Ernährung aus Apple Health: Kalorien und Makros pro Tag, Wasser und Alkohol.
//
// Regel: Gibt es für einen Tag Health-Werte, gelten NUR diese. Die geschätzten Nährwerte aus der
// Foto-Analyse werden nicht dazugezählt (sonst wäre alles doppelt). Ohne Health-Werte zeigen
// Ringe und Verlauf die Schätzung aus deinen Mahlzeiten.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, GlassWater, Minus, Plus, Wine } from 'lucide-react'
import { db } from '../../core/db'
import { heute, letzteTage } from '../../core/datum'
import { zahl } from '../../core/format'
import { WASSERZIEL_MAX, WASSERZIEL_MIN, useWasserziel } from '../../core/einstellungen'
import { GLAS_ML, tageswerte, useHealthTage } from '../../core/healthDaten'
import type { HealthArt } from '../../core/health'
import Karte from '../../core/ui/Karte'
import HealthSymbol from '../../core/ui/HealthSymbol'
import type { Naehrwert, Naehrwerte } from './naehrwerte'

/** Welche Health-Art gehört zu welchem Nährwert? */
const ARTEN: Record<Naehrwert, HealthArt> = { kcal: 'kalorien', protein: 'protein', kohlenhydrate: 'kohlenhydrate', fett: 'fett' }

/** Hook: Nährwerte aus Health pro Tag (Tag -> Summen). Tage ohne Health-Werte fehlen in der Liste. */
export function useHealthNaehrwerte(): Map<string, Naehrwerte> {
  return (
    useLiveQuery(async () => {
      const werte = await db.health.where('art').anyOf(Object.values(ARTEN)).toArray()
      const ergebnis = new Map<string, Naehrwerte>()
      for (const key of Object.keys(ARTEN) as Naehrwert[]) {
        for (const [tag, wert] of tageswerte(werte, ARTEN[key])) {
          if (!ergebnis.has(tag)) ergebnis.set(tag, { kcal: 0, protein: 0, kohlenhydrate: 0, fett: 0 })
          ergebnis.get(tag)![key] = wert
        }
      }
      return ergebnis
    }, []) ?? new Map()
  )
}

/** Wasser in ml für einen Tag: Health ersetzt die gezählten Gläser. */
export const wasserMl = (tag: string, health: Map<string, number> | undefined, glaeser: Map<string, number>) =>
  health?.get(tag) ?? (glaeser.get(tag) ?? 0) * GLAS_ML

const ml = (n: number) => (n >= 1000 ? `${zahl(n / 1000, 2)} l` : `${zahl(n, 0)} ml`)

/** Plus/Minus für das Wasserziel (Gläser + Liter). Auch in den Einstellungen benutzt. */
export function WasserzielStepper({ ziel, setZiel }: { ziel: number; setZiel: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setZiel(Math.max(WASSERZIEL_MIN, ziel - 1))} className="tippbar flex h-10 w-10 items-center justify-center rounded-full bg-text/10" aria-label="Ein Glas weniger als Ziel">
        <Minus size={18} />
      </button>
      <span className="w-24 text-center text-[15px] font-semibold leading-tight">
        {ziel} {ziel === 1 ? 'Glas' : 'Gläser'}
        <span className="block text-[12px] font-normal text-grau">{ml(ziel * GLAS_ML)}</span>
      </span>
      <button onClick={() => setZiel(Math.min(WASSERZIEL_MAX, ziel + 1))} className="tippbar flex h-10 w-10 items-center justify-center rounded-full bg-text/10" aria-label="Ein Glas mehr als Ziel">
        <Plus size={18} />
      </button>
    </div>
  )
}

/** Wasser (Tag + Woche) mit Gläser-Zähler und Alkohol (Tag + Woche, nur aus Health). */
export function WasserUndAlkohol() {
  const [zielGlaeser, setZielGlaeser] = useWasserziel()
  const [zielOffen, setZielOffen] = useState(false)
  const tag = heute()
  const woche = letzteTage(7)
  const health = useHealthTage(['wasser', 'alkohol'], 7)
  const eigene = useLiveQuery(async () => new Map((await db.wasser.where('datum').anyOf(woche).toArray()).map((w) => [w.datum, w.glaeser])), [woche.join()]) ?? new Map<string, number>()

  const ausHealth = health.wasser?.has(tag) ?? false
  const heuteMl = wasserMl(tag, health.wasser, eigene)
  const wocheMl = woche.reduce((s, t) => s + wasserMl(t, health.wasser, eigene), 0)
  const zielMl = zielGlaeser * GLAS_ML
  const glaeser = eigene.get(tag) ?? 0
  const volleGlaeser = Math.min(zielGlaeser, Math.round(heuteMl / GLAS_ML))

  const alkoholHeute = health.alkohol?.get(tag) ?? 0
  const alkoholWoche = woche.reduce((s, t) => s + (health.alkohol?.get(t) ?? 0), 0)
  const hatAlkohol = (health.alkohol?.size ?? 0) > 0

  return (
    <>
      <Karte
        titel="Wasser"
        akzent="#64d2ff"
        rechts={
          <button onClick={() => setZielOffen(!zielOffen)} className="tippbar flex items-center gap-1.5 text-[13px] text-grau" aria-label="Wasserziel ändern">
            {ausHealth && <HealthSymbol />}
            {ml(heuteMl)} / {ml(zielMl)}
            <ChevronDown size={14} className={`transition-transform ${zielOffen ? 'rotate-180' : ''}`} />
          </button>
        }
      >
        {zielOffen && (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-karte2 p-2 pl-3">
            <span className="text-[15px]">Tagesziel</span>
            <WasserzielStepper ziel={zielGlaeser} setZiel={setZielGlaeser} />
          </div>
        )}
        <div className={`mb-3 flex flex-wrap ${zielGlaeser > 10 ? 'justify-start gap-x-1.5 gap-y-2' : 'justify-between'}`}>
          {Array.from({ length: zielGlaeser }, (_, i) => (
            <GlassWater key={i} size={zielGlaeser > 10 ? 26 : 30} color={i < volleGlaeser ? '#64d2ff' : 'var(--color-leer)'} fill={i < volleGlaeser ? '#64d2ff55' : 'transparent'} />
          ))}
        </div>
        {ausHealth ? (
          // Health hat für heute einen Wert -> der ersetzt den Zähler (sonst wäre es doppelt)
          <p className="text-[13px] leading-snug text-grau">Heute kommt der Wert aus Apple Health und ersetzt den Gläser-Zähler.</p>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => db.wasser.put({ datum: tag, glaeser: Math.max(0, glaeser - 1) })} className="tippbar flex h-12 w-14 items-center justify-center rounded-2xl bg-karte2" aria-label="Ein Glas weniger">
              <Minus size={20} />
            </button>
            <button onClick={() => db.wasser.put({ datum: tag, glaeser: glaeser + 1 })} className="tippbar flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#64d2ff] text-[16px] font-semibold text-black">
              <Plus size={20} /> Glas Wasser ({GLAS_ML} ml)
            </button>
          </div>
        )}
        <p className="mt-3 border-t border-linie pt-3 text-[13px] text-grau">
          Letzte 7 Tage: <b className="text-text">{ml(wocheMl)}</b> · Ø {ml(wocheMl / 7)} pro Tag
        </p>
      </Karte>

      {hatAlkohol && (
        <Karte titel="Alkohol" akzent="#bf5af2" rechts={<HealthSymbol />}>
          <div className="flex items-center gap-4">
            <Wine size={30} color="#bf5af2" />
            <p className="flex-1 text-[15px]">
              Heute <b>{zahl(alkoholHeute)}</b> <span className="text-grau">{alkoholHeute === 1 ? 'Getränk' : 'Getränke'}</span>
            </p>
            <p className="text-[15px]">
              7 Tage <b>{zahl(alkoholWoche)}</b>
            </p>
          </div>
        </Karte>
      )}
    </>
  )
}
