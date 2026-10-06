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
const LISTE_SPEICHER = 'geminiModellListe' // verfügbare Modelle (1 Tag gemerkt)
const GESPERRT_SPEICHER = 'geminiNichtVerfuegbar' // Modelle, die Google abgeschaltet hat (404)
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
export const setzeGeminiSchluessel = (k: string) => {
  // Neuer Schlüssel = evtl. andere Modelle erlaubt -> gemerkte Listen vergessen
  if (k.trim() !== lies(SCHLUESSEL_SPEICHER)) {
    schreib(LISTE_SPEICHER, '')
    schreib(GESPERRT_SPEICHER, '')
  }
  schreib(SCHLUESSEL_SPEICHER, k.trim())
}
export const geminiModell = () => lies(MODELL_SPEICHER) || STANDARD_MODELL
export const setzeGeminiModell = (m: string) => schreib(MODELL_SPEICHER, m.trim() === STANDARD_MODELL ? '' : m.trim())

// ---------- Welche Modelle gibt es? ----------
//
// Google schaltet ältere Modelle nach und nach ab ("no longer available to new users").
// Deshalb steht hier KEIN festes Ersatzmodell mehr im Code: Die App fragt Google, welche
// Flash-Modelle dieser Schlüssel benutzen darf, und merkt sich die Liste einen Tag lang.

const LISTE_GUELTIG_MS = 24 * 60 * 60 * 1000
/** Googles zweiter Alias: zeigt immer auf das aktuelle Flash-Lite-Modell. Notnagel, falls die Liste nicht abrufbar ist. */
const LITE_ALIAS = 'gemini-flash-lite-latest'
/** Höchstens so viele Ersatzmodelle pro Foto ausprobieren (schont das kostenlose Kontingent). */
const MAX_ERSATZ = 3

/** Modelle, die bei diesem Schlüssel mit 404 geantwortet haben (abgeschaltet). Werden übersprungen. */
const gesperrte = (): string[] => {
  try {
    return JSON.parse(lies(GESPERRT_SPEICHER) || '[]')
  } catch {
    return []
  }
}
const sperre = (modell: string) => schreib(GESPERRT_SPEICHER, JSON.stringify([...new Set([...gesperrte(), modell])]))

/**
 * Reihenfolge der Ersatzmodelle: fertige vor Vorschau-Versionen, dann neueste Version zuerst,
 * bei gleicher Version normales Flash vor Flash-Lite. Alte Versionen kommen spät, weil Google sie zuerst abschaltet.
 * Beispiel: gemini-3.8-flash, gemini-3.8-flash-lite, gemini-2.5-flash, gemini-3.9-flash-preview-…
 */
export function sortiereModelle(namen: string[]): string[] {
  const version = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0')
  const vorschau = (n: string) => (/preview|exp/.test(n) ? 1 : 0)
  const lite = (n: string) => (n.includes('lite') ? 1 : 0)
  return [...namen].sort((a, b) => vorschau(a) - vorschau(b) || version(b) - version(a) || lite(a) - lite(b) || a.localeCompare(b))
}

/** Aus Googles Modell-Liste die Flash-Modelle, die Text+Bild beantworten können. */
export function waehleFlashModelle(liste: { name?: string; supportedGenerationMethods?: string[] }[]): string[] {
  return liste
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => (m.name ?? '').replace(/^models\//, ''))
    .filter((n) => /^gemini-.*flash/.test(n) && !/image|tts|audio|live|embed|thinking|computer|robotic|8b/.test(n))
}

/** Fragt Google nach den verfügbaren Flash-Modellen (mit Zwischenspeicher). Bei Problemen: leere Liste. */
export async function verfuegbareModelle(schluessel = geminiSchluessel()): Promise<string[]> {
  try {
    const gemerkt = JSON.parse(lies(LISTE_SPEICHER) || 'null') as { zeit: number; modelle: string[] } | null
    if (gemerkt && Date.now() - gemerkt.zeit < LISTE_GUELTIG_MS && gemerkt.modelle.length) return gemerkt.modelle
  } catch {
    // kaputter Zwischenspeicher -> neu laden
  }
  try {
    const antwort = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', { headers: { 'x-goog-api-key': schluessel } })
    if (!antwort.ok) return []
    const daten = (await antwort.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] }
    const modelle = sortiereModelle(waehleFlashModelle(daten.models ?? []))
    if (modelle.length) schreib(LISTE_SPEICHER, JSON.stringify({ zeit: Date.now(), modelle }))
    return modelle
  } catch {
    return []
  }
}

// ---------- Anfrage ----------

/** Wartezeit vor dem zweiten Versuch, wenn Google überlastet ist (503). */
const WARTEZEIT_503 = 2000

/** Kurze, verständliche Einordnung je nach Statuscode (die echte Meldung von Google steht immer dahinter). */
function fehlerText(status: number, nachricht: string): string {
  if (status === 400 && /api key/i.test(nachricht)) return 'Der Gemini-Schlüssel ist ungültig. Bitte unter Mehr → Einstellungen prüfen.'
  if (status === 400) return 'Google hat die Anfrage abgelehnt.'
  if (status === 403) return 'Der Gemini-Schlüssel hat keinen Zugriff. Erstell in Google AI Studio einen neuen.'
  if (status === 404) return 'Das Gemini-Modell gibt es nicht (mehr).'
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
/** Welches Modell die letzte erfolgreiche Antwort geliefert hat (evtl. ein Ersatzmodell). */
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

/** Bei diesen Fehlern lohnt sich ein anderes Modell (Limit, abgeschaltet, überlastet). Bei Schlüssel-Fehlern nicht. */
const anderesModellHilft = (e: unknown): e is GeminiFehler => e instanceof GeminiFehler && [404, 429, 500, 503].includes(e.status)

/** Kürzt Googles Meldung für die Fehleranzeige. */
const kurz = (t: string) => (t.length > 160 ? t.slice(0, 157) + '…' : t)

/**
 * Schickt Teile (Text und/oder Bild) an Gemini und gibt den Antworttext zurück.
 * Mit `schema` antwortet Gemini garantiert als JSON in genau diesem Format.
 * Der Schlüssel steht im Header (nicht in der Adresse, damit er in keinem Verlauf auftaucht).
 *
 * Ablauf: eingestelltes Modell (bei 503 nach 2 Sekunden ein zweiter Versuch). Klappt das wegen
 * Limit (429), Abschaltung (404) oder Überlastung (5xx) nicht, probiert die App bis zu drei andere
 * Flash-Modelle aus Googles aktueller Liste. Schlägt alles fehl, zeigt die Meldung JEDEN Versuch,
 * damit man sieht, woran es zuerst lag.
 */
export async function frageGemini(teile: unknown[], schema?: object): Promise<string> {
  const schluessel = geminiSchluessel()
  if (!schluessel) throw new Error('Es ist noch kein Gemini-Schlüssel eingerichtet (Mehr → Einstellungen).')
  if (!navigator.onLine) throw new Error('Keine Internetverbindung. Trag die Werte einfach von Hand ein.')

  const modell = geminiModell()
  let ersterFehler: GeminiFehler
  try {
    return await sende(modell, schluessel, teile, schema)
  } catch (e) {
    if (!anderesModellHilft(e)) throw e
    ersterFehler = e
    if (e.status === 404) {
      sperre(modell)
      // Ein selbst eingetragenes Modell gibt es nicht mehr -> zurück auf Googles Alias
      if (modell !== STANDARD_MODELL) setzeGeminiModell(STANDARD_MODELL)
    }
  }

  // Überlastet: einmal kurz warten und dasselbe Modell nochmal fragen
  if (ersterFehler.status === 503) {
    await warte(WARTEZEIT_503)
    try {
      return await sende(modell, schluessel, teile, schema)
    } catch (e) {
      if (!anderesModellHilft(e)) throw e
    }
  }

  // Ersatzmodelle: aktuelle Liste von Google, Flash-Lite-Alias als Notnagel
  const versucht = new Set([modell])
  const gesperrt = new Set(gesperrte())
  const kandidaten = [...(modell !== STANDARD_MODELL ? [STANDARD_MODELL] : []), ...(await verfuegbareModelle(schluessel)), LITE_ALIAS]
    .filter((m, i, alle) => alle.indexOf(m) === i && !versucht.has(m) && !gesperrt.has(m))
    .slice(0, MAX_ERSATZ)

  const fehler: GeminiFehler[] = [ersterFehler]
  for (const ersatz of kandidaten) {
    try {
      return await sende(ersatz, schluessel, teile, schema)
    } catch (e) {
      if (!anderesModellHilft(e)) throw e
      if (e.status === 404) sperre(ersatz)
      fehler.push(e)
    }
  }

  // Alles fehlgeschlagen: Überschrift nach dem ERSTEN Fehler (der eigentlichen Ursache), darunter jeder Versuch
  const hatLimit = fehler.some((f) => f.status === 429)
  const ueberschrift = hatLimit ? fehlerText(429, '') : fehlerText(ersterFehler.status, ersterFehler.googleMeldung)
  const versuche = fehler.map((f) => `• HTTP ${f.status} · ${f.modell}: ${kurz(f.googleMeldung || 'keine Meldung')}`).join('\n')
  const zusammen = new GeminiFehler(ersterFehler.status, ersterFehler.googleMeldung, ersterFehler.modell)
  zusammen.message = `${ueberschrift}\n${versuche}`
  throw zusammen
}

/** Kurzer Test, ob Schlüssel und Modell funktionieren (für die Einstellungen). */
export async function testeGemini(): Promise<void> {
  await frageGemini([{ text: 'Antworte nur mit dem Wort: OK' }])
}
