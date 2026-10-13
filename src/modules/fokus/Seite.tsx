// Bereich "Fokus": Pomodoro-Timer (Fokus / Pause, nach 4 Runden lange Pause) oder freie Stoppuhr.
// Gespeichert werden nur die Fokuszeiten (Tabelle "fokus"), darunter steht die Statistik.
// Optional stellt die App beim Start zusätzlich einen echten iPhone-Timer über den Kurzbefehl "Life Timer",
// weil eine Web-App im Hintergrund nicht klingeln kann.
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Pause, Play, Plus, SkipForward, Square } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { db } from '../../core/db'
import { heute, kurzerWochentag, letzteTage, uhrzeit, wochenStart } from '../../core/datum'
import { kurzDatum } from '../../core/format'
import { useEinstellung } from '../../core/einstellungen'
import Seite from '../../core/ui/Seite'
import Karte from '../../core/ui/Karte'
import Ring from '../../core/ui/Ring'
import { Chips, Leer, LoeschKnopf, Schalter } from '../../core/ui/Formular'
import { TIMER_KURZBEFEHL, speichereErgebnis, speichereLauf, stelleIphoneTimer, useFokusUhr, useFokusZeiten, useIphoneTimer } from './lauf'
import {
  PHASEN_NAME,
  anhalten,
  beenden,
  dauerMs,
  laeuft,
  pauseUeberspringen,
  restMs,
  startePomodoro,
  starteStoppuhr,
  uhrText,
  vergangenMs,
  weiter,
  type FokusZeiten,
  type Lauf,
} from './timer'

export const FARBE = '#ff9f0a'
const PAUSE_FARBE = '#30d158'
const ARTEN = ['Pomodoro', 'Stoppuhr'] as const

/** 95 -> "1 h 35 min", 25 -> "25 min" */
export const minutenText = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`)

/** Eine Zeile zum Einstellen einer Zeit mit Plus/Minus. */
function Stepper({ name, wert, einheit, min, max, schritt = 1, onWert }: { name: string; wert: number; einheit: string; min: number; max: number; schritt?: number; onWert: (n: number) => void }) {
  return (
    <div className="flex min-h-12 items-center justify-between">
      <span className="text-[15px]">{name}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onWert(Math.max(min, wert - schritt))} className="tippbar flex h-9 w-9 items-center justify-center rounded-full bg-karte2" aria-label={`${name} verringern`}>
          <Minus size={16} />
        </button>
        <span className="w-16 text-center text-[16px] font-semibold">
          {wert} {einheit}
        </span>
        <button onClick={() => onWert(Math.min(max, wert + schritt))} className="tippbar flex h-9 w-9 items-center justify-center rounded-full bg-karte2" aria-label={`${name} erhöhen`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

export default function FokusSeite() {
  const { lauf, zeiten, jetzt, vorbei, hinweisWeg } = useFokusUhr()
  const [, setZeiten] = useFokusZeiten()
  const [iphoneTimer, setIphoneTimer] = useIphoneTimer()
  const [art, setArt] = useEinstellung<(typeof ARTEN)[number]>('fokusArt', 'Pomodoro')
  const einheiten = useLiveQuery(() => db.fokus.orderBy('datum').reverse().toArray(), []) ?? []

  // ---------- Aktionen ----------
  /** Pomodoro-Phase starten/fortsetzen: Lauf speichern, dann ggf. iPhone-Timer stellen (die App wechselt kurz). */
  async function starte(neu: Lauf) {
    await speichereLauf(neu)
    if (neu.art === 'pomodoro' && neu.ende && iphoneTimer) stelleIphoneTimer(Math.ceil(restMs(neu, Date.now()) / 60_000))
  }
  const start = () => starte(art === 'Pomodoro' ? startePomodoro(zeiten, Date.now()) : starteStoppuhr(Date.now()))
  async function stopp(l: Lauf) {
    const ergebnis = beenden(l, zeiten, Date.now())
    if (ergebnis) await speichereErgebnis(ergebnis, l.art)
    await speichereLauf(null)
  }

  // ---------- Anzeige des Timers ----------
  const pomodoro = lauf?.art === 'pomodoro'
  const phase = lauf?.phase ?? 'fokus'
  const ringFarbe = phase === 'fokus' ? FARBE : PAUSE_FARBE
  let zeitText = art === 'Pomodoro' ? uhrText(dauerMs('fokus', zeiten)) : '0:00'
  let fortschritt = 0
  if (lauf && pomodoro) {
    const rest = Math.max(0, restMs(lauf, jetzt))
    zeitText = uhrText(rest)
    fortschritt = 1 - rest / dauerMs(phase, zeiten)
  } else if (lauf) {
    const ms = vergangenMs(lauf, jetzt)
    zeitText = uhrText(ms)
    fortschritt = (ms % 3_600_000) / 3_600_000 // Stoppuhr: ein Ring = eine Stunde
  }
  const unterzeile = !lauf
    ? art === 'Pomodoro'
      ? `${zeiten.fokus} min Fokus`
      : 'Stoppuhr'
    : pomodoro
      ? `${PHASEN_NAME[phase]} · Runde ${lauf.runde} von ${zeiten.runden}`
      : laeuft(lauf)
        ? 'läuft'
        : 'angehalten'

  // ---------- Statistik ----------
  const proTag = new Map<string, number>()
  for (const e of einheiten) proTag.set(e.datum, (proTag.get(e.datum) ?? 0) + e.minuten)
  const heuteMin = proTag.get(heute()) ?? 0
  const wocheMin = einheiten.filter((e) => e.datum >= wochenStart()).reduce((s, e) => s + e.minuten, 0)
  const sieben = letzteTage(7).map((tag) => ({ tag, name: kurzerWochentag(tag), minuten: proTag.get(tag) ?? 0 }))
  const schnitt = Math.round(sieben.reduce((s, d) => s + d.minuten, 0) / 7)

  const setze = (key: keyof FokusZeiten) => (n: number) => setZeiten({ ...zeiten, [key]: n })
  const grosserKnopf = 'tippbar flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold'

  return (
    <Seite titel="Fokus" farbe={FARBE}>
      <Karte>
        {/* Art wählen geht nur, solange nichts läuft */}
        {!lauf && (
          <div className="mb-4">
            <Chips optionen={ARTEN} wert={art} onWahl={setArt} farbe={FARBE} />
          </div>
        )}

        {/* Ist eine Phase abgelaufen, während die App zu war: Hinweis (antippen blendet ihn aus) */}
        {vorbei && (
          <button onClick={hinweisWeg} className="mb-3 w-full rounded-2xl bg-[#ff9f0a]/15 p-3 text-left text-[14px]">
            {PHASEN_NAME[vorbei.phase]} fertig (vor {Math.max(1, Math.round((Date.now() - vorbei.seit) / 60_000))} min).{' '}
            {vorbei.phase === 'fokus' ? 'Die Runde ist gespeichert. Starte jetzt die Pause oder beende.' : 'Weiter mit der nächsten Fokusrunde?'}
          </button>
        )}

        <div className="flex flex-col items-center py-2">
          <Ring fortschritt={fortschritt} farbe={ringFarbe} groesse={220} dicke={16}>
            <div>
              <p className="text-[48px] font-light tabular-nums leading-none">{zeitText}</p>
              <p className="mt-2 text-[14px] text-grau">{unterzeile}</p>
            </div>
          </Ring>
        </div>

        {/* Knöpfe je nach Zustand */}
        <div className="mt-4 flex gap-2">
          {!lauf && (
            <button onClick={start} className={`${grosserKnopf} text-black`} style={{ background: FARBE }}>
              <Play size={20} fill="black" /> Start
            </button>
          )}
          {lauf && laeuft(lauf) && (
            <button onClick={() => speichereLauf(anhalten(lauf, Date.now()))} className={`${grosserKnopf} bg-karte2`}>
              <Pause size={20} /> Anhalten
            </button>
          )}
          {lauf && !laeuft(lauf) && (
            <button onClick={() => starte(weiter(lauf, Date.now()))} className={`${grosserKnopf} text-black`} style={{ background: ringFarbe }}>
              <Play size={20} fill="black" /> {lauf.bereit ? `${PHASEN_NAME[phase]} starten` : 'Weiter'}
            </button>
          )}
          {lauf && pomodoro && phase !== 'fokus' && (
            <button onClick={() => speichereLauf(pauseUeberspringen(lauf, zeiten))} className="tippbar flex h-14 w-14 items-center justify-center rounded-2xl bg-karte2" aria-label="Pause überspringen">
              <SkipForward size={20} />
            </button>
          )}
          {lauf && (
            <button onClick={() => stopp(lauf)} className="tippbar flex h-14 w-14 items-center justify-center rounded-2xl bg-karte2 text-[#ff453a]" aria-label="Beenden">
              <Square size={18} fill="#ff453a" />
            </button>
          )}
        </div>
      </Karte>

      <Karte titel="Statistik" akzent={FARBE}>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Heute', heuteMin],
            ['Diese Woche', wocheMin],
            ['Ø pro Tag', schnitt],
          ].map(([name, min]) => (
            <div key={name} className="rounded-2xl bg-karte2 py-2">
              <p className="text-[18px] font-bold">{minutenText(Number(min))}</p>
              <p className="text-[12px] text-grau">{name}</p>
            </div>
          ))}
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sieben} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} contentStyle={{ background: '#2c2c2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13 }} formatter={(v) => [minutenText(Number(v)), 'Fokus']} labelFormatter={() => ''} />
              <Bar dataKey="minuten" radius={[6, 6, 6, 6]} minPointSize={3}>
                {sieben.map((d) => (
                  <Cell key={d.tag} fill={d.minuten === 0 ? '#38383a' : d.tag === heute() ? FARBE : '#a35f00'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mb-1 mt-3 text-[13px] text-grau">Letzte Einheiten</p>
        {einheiten.length === 0 ? (
          <Leer>Noch keine Fokuszeit. Starte oben deine erste Runde.</Leer>
        ) : (
          <ul>
            {einheiten.slice(0, 10).map((e, i) => (
              <li key={e.id} className={`flex min-h-12 items-center gap-2 ${i > 0 ? 'border-t border-linie' : ''}`}>
                <span className="flex-1 text-[15px]">
                  {kurzDatum(e.datum)}, {uhrzeit(e.start)}
                  <span className="ml-2 text-[12px] text-grau">{e.art === 'pomodoro' ? 'Pomodoro' : 'Stoppuhr'}</span>
                </span>
                <span className="text-[15px] font-semibold">{minutenText(e.minuten)}</span>
                <LoeschKnopf frage="Eintrag löschen?" onLoeschen={() => db.fokus.delete(e.id)} />
              </li>
            ))}
          </ul>
        )}
      </Karte>

      <Karte titel="Pomodoro-Zeiten">
        <Stepper name="Fokus" wert={zeiten.fokus} einheit="min" min={5} max={120} schritt={5} onWert={setze('fokus')} />
        <Stepper name="Pause" wert={zeiten.pause} einheit="min" min={1} max={30} onWert={setze('pause')} />
        <Stepper name="Lange Pause" wert={zeiten.langePause} einheit="min" min={5} max={60} schritt={5} onWert={setze('langePause')} />
        <Stepper name="Runden bis lange Pause" wert={zeiten.runden} einheit="" min={2} max={8} onWert={setze('runden')} />
        <p className="text-[12px] text-grau">Änderungen gelten ab der nächsten Phase.</p>
      </Karte>

      <Karte titel="iPhone-Timer">
        <div className="flex min-h-12 items-center gap-3">
          <span className="flex-1 text-[15px]">Beim Start iPhone-Timer stellen</span>
          <Schalter an={iphoneTimer} onClick={() => setIphoneTimer(!iphoneTimer)} label="iPhone-Timer stellen" />
        </div>
        <p className="mt-2 text-[12px] leading-snug text-grau">
          Eine Web-App kann bei gesperrtem iPhone nicht klingeln. Deshalb startet die App beim Pomodoro kurz den Kurzbefehl „{TIMER_KURZBEFEHL}“, der einen echten Timer stellt. Hältst du früher an oder beendest, läuft der iPhone-Timer weiter, weil Kurzbefehle einen Timer nicht stoppen können. Anleitung: docs/KURZBEFEHL.md.
        </p>
      </Karte>
    </Seite>
  )
}
