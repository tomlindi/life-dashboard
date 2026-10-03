// Welche Workout-Arten es gibt und welches Symbol zu welcher Art gehört.
import { Activity, Bike, Dumbbell, Flower2, Footprints, Waves, type LucideIcon } from 'lucide-react'

export const ARTEN: Record<string, LucideIcon> = {
  Gym: Dumbbell,
  Laufen: Footprints,
  Rad: Bike,
  Schwimmen: Waves,
  Yoga: Flower2,
  Sonstiges: Activity,
}

/** Symbol für eine Art. Unbekannte Arten (z. B. aus Apple Health) bekommen das Standard-Symbol. */
export const iconFuer = (art: string): LucideIcon => ARTEN[art] ?? Activity

/** Erkennt aus dem Titel eines Kalendertermins, ob es ein geplantes Workout ist. */
export const istWorkoutTermin = (titel: string) =>
  /gym|training|sport|lauf|jogg|rad|schwimm|fitness|yoga|workout|fu(ß|ss)ball|kraft/i.test(titel)
