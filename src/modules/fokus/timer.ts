// Die Rechenregeln des Fokus-Timers (ohne Datenbank, damit man sie testen kann: scripts/test-import).
//
// Pomodoro: Fokus -> Pause -> Fokus -> … nach der 4. Fokusrunde eine lange Pause, dann wieder Runde 1.
// Stoppuhr: zählt einfach hoch, bis du beendest.
//
// Der laufende Timer wird als "Lauf" gespeichert (Einstellung "fokusLaeuft"). Darin steht das geplante
// Ende als Uhrzeit, nicht ein Countdown. So stimmt die Zeit auch, wenn die App zwischendurch zu war.

export type Phase = 'fokus' | 'pause' | 'langePause'

export interface FokusZeiten {
  fokus: number // Minuten
  pause: number
  langePause: number
  runden: number // nach so vielen Fokusrunden kommt die lange Pause
}

export const STANDARD_ZEITEN: FokusZeiten = { fokus: 25, pause: 5, langePause: 15, runden: 4 }

export const PHASEN_NAME: Record<Phase, string> = { fokus: 'Fokus', pause: 'Pause', langePause: 'Lange Pause' }

export interface Lauf {
  art: 'pomodoro' | 'stoppuhr'
  phase: Phase // bei der Stoppuhr immer "fokus"
  runde: number // 1 bis zeiten.runden
  phaseStart: string // ISO: Beginn der aktuellen Phase (für den gespeicherten Eintrag)
  ende?: string // Pomodoro, läuft: geplantes Ende der Phase (ISO)
  restMs?: number // Pomodoro, angehalten oder bereit: verbleibende Zeit
  bereit?: boolean // Pomodoro: Phase ist vorbereitet, aber noch nicht gestartet ("Pause starten")
  laufSeit?: string // Stoppuhr, läuft: seit wann (ISO)
  bisherMs?: number // Stoppuhr: bereits gezählte Zeit vor dem letzten Anhalten
}

/** Eine fertige Fokuszeit, die gespeichert wird. */
export interface Ergebnis {
  start: string
  ende: string
  minuten: number
}

const MIN = 60_000
export const dauerMs = (phase: Phase, z: FokusZeiten) => z[phase] * MIN

/** Welche Phase kommt als Nächstes? */
export function naechstePhase(phase: Phase, runde: number, z: FokusZeiten): { phase: Phase; runde: number } {
  if (phase === 'fokus') return { phase: runde >= z.runden ? 'langePause' : 'pause', runde }
  if (phase === 'pause') return { phase: 'fokus', runde: runde + 1 }
  return { phase: 'fokus', runde: 1 } // nach der langen Pause beginnt ein neuer Durchgang
}

// ---------- Starten, anhalten, weiter ----------

export function startePomodoro(z: FokusZeiten, jetzt: number): Lauf {
  return { art: 'pomodoro', phase: 'fokus', runde: 1, phaseStart: new Date(jetzt).toISOString(), ende: new Date(jetzt + dauerMs('fokus', z)).toISOString() }
}

export function starteStoppuhr(jetzt: number): Lauf {
  const iso = new Date(jetzt).toISOString()
  return { art: 'stoppuhr', phase: 'fokus', runde: 1, phaseStart: iso, laufSeit: iso, bisherMs: 0 }
}

/** Läuft der Timer gerade (nicht angehalten, nicht nur vorbereitet)? */
export const laeuft = (l: Lauf) => (l.art === 'stoppuhr' ? !!l.laufSeit : !!l.ende)

/** Pomodoro: Restzeit in ms. */
export const restMs = (l: Lauf, jetzt: number) => (l.ende ? Date.parse(l.ende) - jetzt : (l.restMs ?? 0))

/** Stoppuhr: bisher gezählte Zeit in ms. */
export const vergangenMs = (l: Lauf, jetzt: number) => (l.bisherMs ?? 0) + (l.laufSeit ? jetzt - Date.parse(l.laufSeit) : 0)

export function anhalten(l: Lauf, jetzt: number): Lauf {
  if (l.art === 'stoppuhr') return { ...l, laufSeit: undefined, bisherMs: vergangenMs(l, jetzt) }
  return { ...l, ende: undefined, restMs: Math.max(0, restMs(l, jetzt)) }
}

export function weiter(l: Lauf, jetzt: number): Lauf {
  if (l.art === 'stoppuhr') return { ...l, laufSeit: new Date(jetzt).toISOString() }
  // Eine vorbereitete Phase beginnt erst jetzt
  const start = l.bereit ? new Date(jetzt).toISOString() : l.phaseStart
  return { ...l, bereit: undefined, phaseStart: start, ende: new Date(jetzt + (l.restMs ?? 0)).toISOString(), restMs: undefined }
}

// ---------- Phase fertig / beenden ----------

/**
 * Pomodoro: Die laufende Phase ist abgelaufen. Ergebnis = die Fokusrunde (nur bei Fokus), gespeichert mit
 * der GEPLANTEN Länge und dem geplanten Ende – auch wenn die App erst später wieder geöffnet wurde.
 * Danach ist die nächste Phase vorbereitet ("bereit") und wartet auf "Start".
 */
export function phaseFertig(l: Lauf, z: FokusZeiten): { ergebnis?: Ergebnis; neu: Lauf } {
  const ende = l.ende ?? new Date().toISOString()
  const ergebnis = l.phase === 'fokus' ? { start: l.phaseStart, ende, minuten: z.fokus } : undefined
  const n = naechstePhase(l.phase, l.runde, z)
  return { ergebnis, neu: { art: 'pomodoro', phase: n.phase, runde: n.runde, phaseStart: ende, bereit: true, restMs: dauerMs(n.phase, z) } }
}

/** Pause überspringen: gleich die nächste Fokusrunde vorbereiten. */
export function pauseUeberspringen(l: Lauf, z: FokusZeiten): Lauf {
  const n = naechstePhase(l.phase, l.runde, z)
  return { art: 'pomodoro', phase: n.phase, runde: n.runde, phaseStart: new Date().toISOString(), bereit: true, restMs: dauerMs(n.phase, z) }
}

/**
 * Beenden. Gespeichert wird die bisher geschaffte Fokuszeit (mindestens 1 Minute, sonst nichts):
 * Stoppuhr = gezählte Zeit, Pomodoro während Fokus = geplante Länge minus Restzeit.
 */
export function beenden(l: Lauf, z: FokusZeiten, jetzt: number): Ergebnis | undefined {
  let ms = 0
  if (l.art === 'stoppuhr') ms = vergangenMs(l, jetzt)
  else if (l.phase === 'fokus' && !l.bereit) ms = dauerMs('fokus', z) - Math.max(0, restMs(l, jetzt))
  const minuten = Math.floor(ms / MIN)
  if (minuten < 1) return undefined
  return { start: l.phaseStart, ende: new Date(jetzt).toISOString(), minuten }
}

/** "12:34" bzw. "1:02:03" aus Millisekunden. */
export function uhrText(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sek = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sek}` : `${m}:${sek}`
}
