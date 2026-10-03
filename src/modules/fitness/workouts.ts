// Hilfen rund um die Workout-Liste.
import type { GymEinheit, Workout } from '../../core/db'

const NEUNZIG_MIN = 90 * 60 * 1000
const naheBei = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) < NEUNZIG_MIN

/**
 * Entfernt doppelte Gym-Einträge: Wenn du ein Training in der App loggst UND deine Uhr es
 * als Workout an Apple Health schickt, gibt es zwei Einträge. Dann behalten wir den aus Health
 * (genauere Dauer) und zeigen dort trotzdem die Übungen aus dem Gym-Log an.
 */
export function ohneDoppelte(workouts: Workout[]): Workout[] {
  return workouts.filter(
    (w) => !(w.id.startsWith('gym:') && workouts.some((x) => !x.id.startsWith('gym:') && x.art === 'Gym' && naheBei(x.start, w.start))),
  )
}

/** Findet das Gym-Training (mit Übungen), das zu einem Workout gehört. */
export function gymTrainingZu(w: Workout, einheiten: GymEinheit[]): GymEinheit | undefined {
  if (w.id.startsWith('gym:')) return einheiten.find((e) => `gym:${e.id}` === w.id)
  if (w.art !== 'Gym') return undefined
  return einheiten.find((e) => e.ende && naheBei(e.start, w.start))
}
