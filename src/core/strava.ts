// VORBEREITUNG für eine spätere direkte Strava-Anbindung (noch nicht aktiv).
//
// Im Moment kommen Strava-Aktivitäten über Apple Health in die App (Strava schreibt sie dorthin,
// der Kurzbefehl liest sie aus). Das reicht für den Anfang.
//
// Für eine direkte Anbindung bräuchte man die Strava-API (Anmeldung per OAuth). Weil die App
// keinen Server hat, wäre dafür ein kleiner kostenloser Helfer nötig (z. B. eine Netlify/Vercel
// Function), der das geheime "Client Secret" verwahrt. Danach müsste man nur:
//   1. Aktivitäten von https://www.strava.com/api/v3/athlete/activities laden
//   2. jede Aktivität mit stravaZuImport() umwandeln
//   3. das Ergebnis an importiere({ workouts: [...] }) aus core/import.ts übergeben
// Die eindeutige ID "strava:<nummer>" verhindert Duplikate.
//
// Hinweis: Dasselbe Workout könnte dann doppelt auftauchen (einmal über Health, einmal direkt).
// Dafür müsste man beim Umstieg im Kurzbefehl Workouts mit Quelle "Strava" weglassen.

/** Die Felder einer Strava-Aktivität, die wir brauchen (Auszug aus der Strava-API). */
export interface StravaAktivitaet {
  id: number
  sport_type: string // z. B. "Run", "Ride", "WeightTraining"
  start_date: string // ISO, UTC
  moving_time: number // Sekunden
  distance: number // Meter
}

/** Wandelt eine Strava-Aktivität in unser Import-Format (Workout) um. */
export function stravaZuImport(a: StravaAktivitaet) {
  return {
    id: `strava:${a.id}`,
    quelle: 'strava',
    art: a.sport_type, // wird beim Import automatisch übersetzt (Run -> Laufen …)
    start: a.start_date,
    dauerMin: Math.round(a.moving_time / 60),
    distanzKm: a.distance > 0 ? a.distance / 1000 : undefined,
  }
}
