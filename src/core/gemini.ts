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
  // Speichern = Neustart: gemerkte Modell-Liste und gesperrte Modelle vergessen (evtl. neuer Schlüssel mit anderen Modellen)
  schreib(LISTE_SPEICHER, '')
  schreib(GESPERRT_SPEICHER, '')
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
/** So lange wird ein abgeschaltetes Modell übersprungen, danach wieder probiert. */
const SPERRE_GUELTIG_MS = 7 * LISTE_GUELTIG_MS
/** Googles zweiter Alias: zeigt immer auf das aktuelle Flash-Lite-Modell (ein anderes Modell als Flash). */
const LITE_ALIAS = 'gemini-flash-lite-latest'
/** Googles Aliase werden nie abgeschaltet und daher auch nie gesperrt. */
const istAlias = (m: string) => m === STANDARD_MODELL || m === LITE_ALIAS
/** Höchstens so viele Ersatzmodelle pro Foto ausprobieren (schont das kostenlose Kontingent). */
const MAX_ERSATZ = 3

/** Modelle, die bei diesem Schlüssel mit 404 geantwortet haben (abgeschaltet), mit Zeitpunkt. Abgelaufene fallen raus. */
function gesperrte(): string[] {
  try {
    const roh: unknown = JSON.parse(lies(GESPERRT_SPEICHER) || '{}')
    if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return []
    const jetzt = Date.now()
    return Object.entries(roh as Record<string, unknown>)
      .filter(([, zeit]) => typeof zeit === 'number' && jetzt - zeit >= 0 && jetzt - zeit < SPERRE_GUELTIG_MS)
      .map(([modell]) => modell)
  } catch {
    return []
  }
}
function sperre(modell: string) {
  if (istAlias(modell)) return
  const jetzt = Date.now()
  schreib(GESPERRT_SPEICHER, JSON.stringify(Object.fromEntries([...gesperrte(), modell].map((m) => [m, jetzt]))))
}

/**
 * Reihenfolge der Ersatzmodelle: Googles Aliase zuerst (werden nie abgeschaltet), dann fertige vor Vorschau-Versionen,
 * neueste Version zuerst, bei gleicher Version normales Flash vor Flash-Lite. Alte Versionen kommen spät,
 * weil Google sie zuerst abschaltet.
 * Beispiel: gemini-flash-latest, gemini-flash-lite-latest, gemini-3.8-flash, gemini-3.8-flash-lite, gemini-2.5-flash, gemini-3.9-flash-preview-…
 */
export function sortiereModelle(namen: string[]): string[] {
  const version = (n: string) => (/-latest$/.test(n) ? 999 : parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0'))
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
  if (!schluessel) return []
  try {
    const gemerkt = JSON.parse(lies(LISTE_SPEICHER) || 'null') as { zeit?: unknown; modelle?: unknown } | null
    const alter = Date.now() - (typeof gemerkt?.zeit === 'number' ? gemerkt.zeit : NaN)
    const modelle = gemerkt?.modelle
    if (alter >= 0 && alter < LISTE_GUELTIG_MS && Array.isArray(modelle) && modelle.length && modelle.every((m) => typeof m === 'string')) return modelle
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

/** Bei diesen Fehlern des HAUPTmodells lohnt sich ein anderes Modell (abgeschaltet, Limit, Störung). Bei Schlüssel-Fehlern nicht. */
const anderesModellHilft = (e: unknown): e is GeminiFehler => e instanceof GeminiFehler && (e.status === 404 || e.status === 429 || e.status >= 500)

/** Eine Zeile pro Versuch für die Fehleranzeige: kurz, bei Limit mit Wartezeit statt Googles langem Text. */
function versuchsZeile(f: GeminiFehler): string {
  const sekunden = f.status === 429 ? f.googleMeldung.match(/retry in ([\d.]+)\s*s/i)?.[1] : undefined
  const erste = (f.googleMeldung || 'keine Meldung').split('\n')[0]
  const text = sekunden ? `Limit erreicht, wieder frei in ca. ${Math.ceil(Number(sekunden))} s` : erste.length > 140 ? erste.slice(0, 137) + '…' : erste
  return `• HTTP ${f.status} · ${f.modell}: ${text}`
}

/**
 * Schickt Teile (Text und/oder Bild) an Gemini und gibt den Antworttext zurück.
 * Mit `schema` antwortet Gemini garantiert als JSON in genau diesem Format.
 * Der Schlüssel steht im Header (nicht in der Adresse, damit er in keinem Verlauf auftaucht).
 *
 * Ablauf: eingestelltes Modell (bei 503 nach 2 Sekunden ein zweiter Versuch). Klappt das wegen
 * Abschaltung (404), Limit (429) oder Störung (5xx) nicht, probiert die App bis zu drei andere
 * Flash-Modelle aus Googles aktueller Liste. Schlägt alles fehl, steht oben die eigentliche Ursache
 * und darunter jeder Versuch.
 */
export async function frageGemini(teile: unknown[], schema?: object): Promise<string> {
  const schluessel = geminiSchluessel()
  if (!schluessel) throw new Error('Es ist noch kein Gemini-Schlüssel eingerichtet (Mehr → Einstellungen).')
  if (!navigator.onLine) throw new Error('Keine Internetverbindung. Trag die Werte einfach von Hand ein.')

  // Ein selbst eingetragenes Modell, das Google abgeschaltet hat -> zurück auf Googles Alias
  const pruefeAbgeschaltet = (m: string) => {
    sperre(m)
    if (m !== STANDARD_MODELL) setzeGeminiModell(STANDARD_MODELL)
  }
  let modell = geminiModell()
  if (modell !== STANDARD_MODELL && gesperrte().includes(modell)) {
    setzeGeminiModell(STANDARD_MODELL)
    modell = STANDARD_MODELL
  }

  const fehler: GeminiFehler[] = []
  try {
    return await sende(modell, schluessel, teile, schema)
  } catch (e) {
    if (!anderesModellHilft(e)) throw e
    fehler.push(e)
    if (e.status === 404) pruefeAbgeschaltet(modell)
  }

  // Überlastet: einmal kurz warten und dasselbe Modell nochmal fragen
  if (fehler[0].status === 503) {
    await warte(WARTEZEIT_503)
    try {
      return await sende(modell, schluessel, teile, schema)
    } catch (e) {
      if (!anderesModellHilft(e)) throw e
      if (e.status !== 503) fehler.push(e) // ein zweites "überlastet" macht die Liste nur länger
      if (e.status === 404) pruefeAbgeschaltet(modell)
    }
  }

  // Ersatzmodelle: Aliase und aktuelle Liste von Google (Flash-Lite-Alias als Notnagel, falls die Liste fehlt)
  const gesperrt = new Set(gesperrte())
  const kandidaten = [...new Set([STANDARD_MODELL, LITE_ALIAS, ...(await verfuegbareModelle(schluessel))])]
    .filter((m) => m !== modell && !gesperrt.has(m))
    .slice(0, MAX_ERSATZ)

  let abbruch = ''
  for (const ersatz of kandidaten) {
    try {
      return await sende(ersatz, schluessel, teile, schema)
    } catch (e) {
      if (!(e instanceof GeminiFehler)) {
        // Netz weg oder leere Antwort beim Ersatzmodell: aufhören, aber die eigentliche Ursache nicht verdecken
        abbruch = `• ${ersatz}: ${((e as Error)?.message ?? 'Fehler').split('\n')[0]}`
        break
      }
      if (e.status === 404) sperre(ersatz)
      fehler.push(e) // auch 400/403 eines Ersatzmodells betrifft nur dieses Modell -> nächstes probieren
    }
  }

  // Alles fehlgeschlagen: Überschrift nach der eigentlichen Ursache, darunter jeder Versuch.
  // Ein 404 heißt nur "dieses eine Modell ist abgeschaltet" -> Ursache ist dann der erste ANDERE Fehler (z. B. überlastet).
  const ursache = fehler.find((f) => f.status !== 404) ?? fehler[0]
  const gesamt = new GeminiFehler(ursache.status, ursache.googleMeldung, ursache.modell)
  gesamt.message = [fehlerText(ursache.status, ursache.googleMeldung), ...fehler.map(versuchsZeile), ...(abbruch ? [abbruch] : [])].join('\n')
  throw gesamt
}

/** Kurzer Test, ob Schlüssel und Modell funktionieren (für die Einstellungen). */
export async function testeGemini(): Promise<void> {
  await frageGemini([{ text: 'Antworte nur mit dem Wort: OK' }])
}
