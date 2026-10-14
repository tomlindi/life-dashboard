// Fokus-Timer: Speichern in der Datenbank, iPhone-Timer per Kurzbefehl und ein Hook, der den Ablauf überwacht.
// Die reinen Rechenregeln stehen in timer.ts.
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, holeEinstellung, setzeEinstellung } from '../../core/db'
import { neueId, tagVon } from '../../core/datum'
import { useEinstellung } from '../../core/einstellungen'
import { piep, vibriere } from '../../core/ton'
import { STANDARD_ZEITEN, laeuft, phaseFertig, restMs, type Ergebnis, type FokusZeiten, type Lauf, type Phase } from './timer'

const LAUF = 'fokusLaeuft'
export const TIMER_KURZBEFEHL = 'Life Timer'

export const useFokusZeiten = () => useEinstellung<FokusZeiten>('fokusZeiten', STANDARD_ZEITEN)
export const useIphoneTimer = () => useEinstellung<boolean>('fokusIphoneTimer', true)

/** Für welches Schulfach gerade gelernt wird (null = ohne Fach). Wird beim Speichern einer Fokuszeit mitgespeichert. */
export const FOKUS_FACH = 'fokusFach'
export const useFokusFach = () => useEinstellung<string | null>(FOKUS_FACH, null)

/** Der laufende Timer (oder null). `undefined` = lädt noch. */
export function useFokusLauf(): Lauf | null | undefined {
  return useLiveQuery(() => holeEinstellung<Lauf | null>(LAUF, null), [])
}

export const speichereLauf = (l: Lauf | null) => setzeEinstellung(LAUF, l)

/** Eine fertige Fokuszeit speichern (mit dem gerade gewählten Fach). */
export async function speichereErgebnis(e: Ergebnis, art: Lauf['art']) {
  const fachId = (await holeEinstellung<string | null>(FOKUS_FACH, null)) ?? undefined
  return db.fokus.add({ id: neueId(), datum: tagVon(e.start), start: e.start, ende: e.ende, minuten: e.minuten, art, fachId })
}

/**
 * Die laufende Pomodoro-Phase ist abgelaufen: Fokusrunde speichern, nächste Phase vorbereiten.
 * In einer Transaktion mit Prüfung des geplanten Endes, damit es nie doppelt gespeichert wird
 * (z. B. wenn Heute-Banner und Fokus-Seite gleichzeitig nachsehen).
 */
async function schliessePhaseAb(erwartetesEnde: string, z: FokusZeiten) {
  return db.transaction('rw', db.einstellungen, db.fokus, async () => {
    const l = await holeEinstellung<Lauf | null>(LAUF, null)
    if (!l || l.ende !== erwartetesEnde) return
    const { ergebnis, neu } = phaseFertig(l, z)
    if (ergebnis) await speichereErgebnis(ergebnis, 'pomodoro')
    await speichereLauf(neu)
  })
}

/**
 * Stellt einen echten iPhone-Timer über den Kurzbefehl "Life Timer" (klingelt auch bei gesperrtem iPhone).
 * Die App wechselt dafür kurz in die Kurzbefehle-App.
 */
export function stelleIphoneTimer(minuten: number) {
  window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(TIMER_KURZBEFEHL)}&input=text&text=${Math.round(minuten)}`
}

/**
 * Hook: aktuelle Zeit (alle 250 ms) und automatischer Phasenabschluss.
 * Läuft eine Phase ab, während die App offen ist: Ton + Vibration. War die App zu, wird nur abgeschlossen;
 * `vorbei` sagt dann, welche Phase wann zu Ende war (für den Hinweis "Fokus fertig, vor 3 min").
 */
export function useFokusUhr() {
  const lauf = useFokusLauf()
  const [zeiten] = useFokusZeiten()
  const [jetzt, setJetzt] = useState(Date.now())
  const [vorbei, setVorbei] = useState<{ seit: number; phase: Phase } | null>(null)
  const erledigt = useRef<string | null>(null) // dieses Ende wurde schon behandelt (kein doppelter Ton)

  // Nur ticken, wenn etwas läuft (spart Akku)
  const aktiv = !!lauf && laeuft(lauf)
  useEffect(() => {
    if (!aktiv) return
    const t = setInterval(() => setJetzt(Date.now()), 250)
    return () => clearInterval(t)
  }, [aktiv])

  // Pomodoro abgelaufen?
  useEffect(() => {
    if (!lauf || lauf.art !== 'pomodoro' || !lauf.ende) return
    const rest = restMs(lauf, Date.now())
    if (rest > 0) return
    const ende = lauf.ende
    if (erledigt.current === ende) return
    erledigt.current = ende
    const ueberfaellig = -rest
    if (ueberfaellig < 60_000) {
      // gerade eben abgelaufen, App ist offen
      piep()
      vibriere()
      setVorbei(null)
    } else setVorbei({ seit: Date.parse(ende), phase: lauf.phase }) // war zu: nur Hinweis
    void schliessePhaseAb(ende, zeiten)
  }, [lauf, jetzt, zeiten])

  return { lauf, zeiten, jetzt, vorbei, hinweisWeg: () => setVorbei(null) }
}
