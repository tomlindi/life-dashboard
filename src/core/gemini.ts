// Verbindung zu GOOGLE GEMINI (kostenlos) für die Foto-Analyse in "Ernährung".
//
// Der API-Schlüssel wird NUR im Browser-Speicher dieses Geräts abgelegt (localStorage),
// nicht in der Datenbank. Dadurch landet er weder in Backups noch im Code noch auf GitHub.
// Einen kostenlosen Schlüssel gibt es unter https://aistudio.google.com/apikey
//
// Was gefragt wird und wie die Antwort aussieht, steht in core/ki.ts. Diese Datei kümmert sich
// nur um Schlüssel, Modell und die eigentliche Anfrage an Google.

const SCHLUESSEL_SPEICHER = 'geminiApiKey'
const MODELL_SPEICHER = 'geminiModell'
/** Googles Alias, der immer auf das aktuelle Flash-Modell zeigt. */
export const STANDARD_MODELL = 'gemini-flash-latest'

// ---------- Schlüssel & Modell (nur lokal) ----------

const lies = (k: string) => {
  try {
    return localStorage.getItem(k) ?? ''
  } catch {
    return ''
  }
}
const schreib = (k: string, wert: string) => {
  try {
    if (wert) localStorage.setItem(k, wert)
    else localStorage.removeItem(k)
  } catch {
    // Speicher blockiert (z. B. privater Modus): dann bleibt die KI eben aus
  }
}

export const geminiSchluessel = () => lies(SCHLUESSEL_SPEICHER)
export const setzeGeminiSchluessel = (k: string) => schreib(SCHLUESSEL_SPEICHER, k.trim())
export const geminiModell = () => lies(MODELL_SPEICHER) || STANDARD_MODELL
export const setzeGeminiModell = (m: string) => schreib(MODELL_SPEICHER, m.trim() === STANDARD_MODELL ? '' : m.trim())

// ---------- Anfrage ----------

/** Ersatzmodell, wenn das eingestellte Modell am Limit ist (429), fehlt (404) oder dauerhaft überlastet ist (503). */
export const ERSATZ_MODELL = 'gemini-2.5-flash'
/** Wartezeit vor dem zweiten Versuch, wenn Google überlastet ist (503). */
const WARTEZEIT_503 = 2000

/** Kurze, verständliche Einordnung je nach Statuscode (die echte Meldung von Google steht immer dahinter). */
function fehlerText(status: number, nachricht: string): string {
  if (status === 400 && /api key/i.test(nachricht)) return 'Der Gemini-Schlüssel ist ungültig. Bitte unter Mehr → Einstellungen prüfen.'
  if (status === 400) return 'Google hat die Anfrage abgelehnt.'
  if (status === 403) return 'Der Gemini-Schlüssel hat keinen Zugriff. Erstell in Google AI Studio einen neuen.'
  if (status === 404) return 'Das Gemini-Modell wurde nicht gefunden.'
  if (status === 429) return 'Das kostenlose Gemini-Limit ist erreicht. Warte kurz und versuch es nochmal.'
  if (status === 503) return 'Google ist gerade überlastet. Versuch es gleich nochmal.'
  if (status >= 500) return 'Bei Google ist ein Fehler aufgetreten. Versuch es gleich nochmal.'
  return 'Gemini meldet einen Fehler.'
}

/** Fehler von Google MIT echtem HTTP-Statuscode und Googles eigener Meldung. */
export class GeminiFehler extends Error {
  status: number
  googleMeldung: string
  modell: string
  constructor(status: number, googleMeldung: string, modell: string) {
    super(`${fehlerText(status, googleMeldung)}\nHTTP ${status} · ${modell}: ${googleMeldung || 'keine Meldung von Google'}`)
    this.name = 'GeminiFehler'
    this.status = status
    this.googleMeldung = googleMeldung
    this.modell = modell
  }
}

const warte = (ms: number) => new Promise((fertig) => setTimeout(fertig, ms))

let letztesModell = ''
/** Welches Modell die letzte erfolgreiche Antwort geliefert hat (evtl. das Ersatzmodell). */
export const zuletztGenutztesModell = () => letztesModell || geminiModell()

/** Genau eine Anfrage an ein bestimmtes Modell. Wirft GeminiFehler bei HTTP-Fehlern. */
async function sende(modell: string, schluessel: string, teile: unknown[], schema?: object): Promise<string> {
  let antwort: Response
  try {
    antwort = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modell)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': schluessel },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: teile }],
        generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } : { temperature: 0 },
      }),
    })
  } catch (e) {
    throw new Error(`Google ist nicht erreichbar. Prüf dein WLAN oder deine mobilen Daten.\n(${(e as Error)?.message || 'Netzwerkfehler'})`)
  }
  const roh = await antwort.text().catch(() => '')
  let daten: { error?: { message?: string }; candidates?: { content?: { parts?: { text?: string }[] } }[] } = {}
  try {
    daten = JSON.parse(roh)
  } catch {
    // keine JSON-Antwort (z. B. eine HTML-Fehlerseite) -> dann zeigen wir den Rohtext
  }
  if (!antwort.ok) throw new GeminiFehler(antwort.status, daten?.error?.message ?? roh.slice(0, 300), modell)
  const text = daten?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text
  if (!text) throw new Error('Gemini hat keine Antwort geliefert (evtl. wurde das Foto blockiert). Trag die Werte bitte von Hand ein.')
  letztesModell = modell
  return text
}

/** Fragt ein Modell. Bei 503 (überlastet) wird nach 2 Sekunden EINMAL automatisch neu versucht. */
async function sendeMitWiederholung(modell: string, schluessel: string, teile: unknown[], schema?: object): Promise<string> {
  try {
    return await sende(modell, schluessel, teile, schema)
  } catch (e) {
    if (!(e instanceof GeminiFehler) || e.status !== 503) throw e
    await warte(WARTEZEIT_503)
    return sende(modell, schluessel, teile, schema)
  }
}

/**
 * Schickt Teile (Text und/oder Bild) an Gemini und gibt den Antworttext zurück.
 * Mit `schema` antwortet Gemini garantiert als JSON in genau diesem Format.
 * Der Schlüssel steht im Header (nicht in der Adresse, damit er in keinem Verlauf auftaucht).
 * Bei 429 (Limit erreicht), 404 (Modell nicht gefunden) oder anhaltendem 503 wird automatisch ERSATZ_MODELL benutzt.
 */
export async function frageGemini(teile: unknown[], schema?: object): Promise<string> {
  const schluessel = geminiSchluessel()
  if (!schluessel) throw new Error('Es ist noch kein Gemini-Schlüssel eingerichtet (Mehr → Einstellungen).')
  if (!navigator.onLine) throw new Error('Keine Internetverbindung. Trag die Werte einfach von Hand ein.')

  const modell = geminiModell()
  try {
    return await sendeMitWiederholung(modell, schluessel, teile, schema)
  } catch (e) {
    // 503 kommt hier nur an, wenn auch der zweite Versuch überlastet war -> dann ebenfalls anderes Modell
    const wechseln = e instanceof GeminiFehler && [429, 404, 503].includes(e.status) && modell !== ERSATZ_MODELL
    if (!wechseln) throw e
    return sendeMitWiederholung(ERSATZ_MODELL, schluessel, teile, schema)
  }
}

/** Kurzer Test, ob Schlüssel und Modell funktionieren (für die Einstellungen). */
export async function testeGemini(): Promise<void> {
  await frageGemini([{ text: 'Antworte nur mit dem Wort: OK' }])
}
