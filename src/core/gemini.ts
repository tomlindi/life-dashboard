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

/** Verständliche Fehlermeldung je nach Antwort von Google. */
function fehlerText(status: number, nachricht: string): string {
  if (status === 400 && /api key/i.test(nachricht)) return 'Der Gemini-Schlüssel ist ungültig. Bitte unter Mehr → Einstellungen prüfen.'
  if (status === 403) return 'Der Gemini-Schlüssel hat keinen Zugriff. Erstell in Google AI Studio einen neuen.'
  if (status === 404) return `Das Modell „${geminiModell()}“ gibt es nicht (mehr). In den Einstellungen auf „${STANDARD_MODELL}“ zurücksetzen.`
  if (status === 429) return 'Das kostenlose Gemini-Limit ist gerade erreicht. Warte kurz und versuch es nochmal.'
  if (status >= 500) return 'Google ist gerade nicht erreichbar. Versuch es gleich nochmal.'
  return `Gemini meldet Fehler ${status}: ${nachricht || 'unbekannt'}`
}

/**
 * Schickt Teile (Text und/oder Bild) an Gemini und gibt den Antworttext zurück.
 * Mit `schema` antwortet Gemini garantiert als JSON in genau diesem Format.
 * Der Schlüssel steht im Header (nicht in der Adresse, damit er in keinem Verlauf auftaucht).
 */
export async function frageGemini(teile: unknown[], schema?: object): Promise<string> {
  const schluessel = geminiSchluessel()
  if (!schluessel) throw new Error('Es ist noch kein Gemini-Schlüssel eingerichtet (Mehr → Einstellungen).')
  if (!navigator.onLine) throw new Error('Keine Internetverbindung. Trag die Werte einfach von Hand ein.')

  let antwort: Response
  try {
    antwort = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModell())}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': schluessel },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: teile }],
        generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } : { temperature: 0 },
      }),
    })
  } catch {
    throw new Error('Google ist nicht erreichbar. Prüf dein WLAN oder deine mobilen Daten.')
  }
  const daten = await antwort.json().catch(() => ({}))
  if (!antwort.ok) throw new Error(fehlerText(antwort.status, daten?.error?.message ?? ''))
  const text: string | undefined = daten?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text
  if (!text) throw new Error('Gemini hat keine Antwort geliefert (evtl. wurde das Foto blockiert). Trag die Werte bitte von Hand ein.')
  return text
}

/** Kurzer Test, ob Schlüssel und Modell funktionieren (für die Einstellungen). */
export async function testeGemini(): Promise<void> {
  await frageGemini([{ text: 'Antworte nur mit dem Wort: OK' }])
}
