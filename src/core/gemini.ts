// FOTO-ANALYSE MIT GOOGLE GEMINI
//
// Der API-Schlüssel wird NUR im Browser-Speicher dieses Geräts abgelegt (localStorage),
// nicht in der Datenbank. Dadurch landet er weder in Backups noch im Code noch auf GitHub.
// Einen kostenlosen Schlüssel gibt es unter https://aistudio.google.com/apikey
//
// Ablauf: Foto verkleinern -> an Gemini schicken -> Gemini antwortet in einem festen JSON-Format
// (Name, Bewertung, Tipp, geschätzte Nährwerte) -> du kannst alles vor dem Speichern ändern.
import type { Bewertung, Naehrwerte } from './db'

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
    // Speicher blockiert (z. B. privater Modus) – dann klappt es eben nicht
  }
}

export const holeSchluessel = () => lies(SCHLUESSEL_SPEICHER)
export const setzeSchluessel = (k: string) => schreib(SCHLUESSEL_SPEICHER, k.trim())
export const holeModell = () => lies(MODELL_SPEICHER) || STANDARD_MODELL
export const setzeModell = (m: string) => schreib(MODELL_SPEICHER, m.trim() === STANDARD_MODELL ? '' : m.trim())

// ---------- Bild verkleinern ----------

export interface Bild {
  base64: string // ohne "data:…;base64,"-Präfix (so will es die API)
  mime: string
  dataUrl: string
}

/** Verkleinert ein Foto auf max. `maxPx` Pixel (längste Seite) und speichert es als JPEG. */
export async function verkleinere(datei: Blob | string, maxPx: number, qualitaet: number): Promise<Bild> {
  // Über ein <img> laden: So werden iPhone-Fotos automatisch richtig herum gedreht
  const url = typeof datei === 'string' ? datei : URL.createObjectURL(datei)
  const bild = new Image()
  try {
    await new Promise<void>((fertig, fehler) => {
      bild.onload = () => fertig()
      bild.onerror = () => fehler(new Error('Das Bild konnte nicht gelesen werden.'))
      bild.src = url
    })
  } finally {
    if (typeof datei !== 'string') URL.revokeObjectURL(url)
  }
  const faktor = Math.min(1, maxPx / Math.max(bild.naturalWidth, bild.naturalHeight))
  const leinwand = document.createElement('canvas')
  leinwand.width = Math.round(bild.naturalWidth * faktor)
  leinwand.height = Math.round(bild.naturalHeight * faktor)
  leinwand.getContext('2d')!.drawImage(bild, 0, 0, leinwand.width, leinwand.height)
  const dataUrl = leinwand.toDataURL('image/jpeg', qualitaet)
  return { dataUrl, mime: 'image/jpeg', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

// ---------- Analyse ----------

export interface Analyse {
  erkannt: boolean // false = auf dem Foto ist kein Essen zu sehen
  name: string
  bewertung: Bewertung
  tipp: string
  portion: string
  naehrwerte: Naehrwerte
}

const ANWEISUNG = `Du bist eine freundliche Ernährungsberaterin für einen sportlichen Schüler (Krafttraining und Handball).
Analysiere das Foto einer Mahlzeit und antworte auf Deutsch.
- name: kurzer, typischer Name des Gerichts (z. B. "Spaghetti Bolognese")
- bewertung: "gesund", "okay" oder "ungesund" (ausgewogen, Eiweiß, Gemüse, Verarbeitungsgrad, Zucker, Fett)
- tipp: ein konkreter, motivierender Satz, wie man das Gericht verbessern oder gut ergänzen kann
- portion: geschätzte sichtbare Menge, z. B. "1 Teller, ca. 450 g"
- Nährwerte für die SICHTBARE Portion schätzen: kcal, eiweiss, kohlenhydrate, fett, zucker, ballaststoffe (in Gramm, ganze Zahlen)
- erkannt: false, wenn auf dem Foto kein Essen oder Getränk zu sehen ist (dann name "Kein Essen erkannt" und Nährwerte 0)`

/** Festes Antwortformat: So antwortet Gemini immer mit genau diesen Feldern. */
const ANTWORT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    erkannt: { type: 'BOOLEAN' },
    name: { type: 'STRING' },
    bewertung: { type: 'STRING', enum: ['gesund', 'okay', 'ungesund'] },
    tipp: { type: 'STRING' },
    portion: { type: 'STRING' },
    kcal: { type: 'NUMBER' },
    eiweiss: { type: 'NUMBER' },
    kohlenhydrate: { type: 'NUMBER' },
    fett: { type: 'NUMBER' },
    zucker: { type: 'NUMBER' },
    ballaststoffe: { type: 'NUMBER' },
  },
  required: ['erkannt', 'name', 'bewertung', 'tipp', 'portion', 'kcal', 'eiweiss', 'kohlenhydrate', 'fett', 'zucker', 'ballaststoffe'],
}

/** Verständliche Fehlermeldung je nach Antwort von Google. */
function fehlerText(status: number, nachricht: string): string {
  if (status === 400 && /api key/i.test(nachricht)) return 'Der API-Schlüssel ist ungültig. Bitte in Mehr → Einstellungen prüfen.'
  if (status === 403) return 'Der API-Schlüssel hat keinen Zugriff. Bitte in Google AI Studio einen neuen erstellen.'
  if (status === 404) return `Das Modell „${holeModell()}“ gibt es nicht (mehr). In den Einstellungen auf „${STANDARD_MODELL}“ zurücksetzen.`
  if (status === 429) return 'Das kostenlose Limit ist gerade erreicht. Warte kurz und versuch es nochmal.'
  if (status >= 500) return 'Google ist gerade nicht erreichbar. Versuch es gleich nochmal.'
  return `Fehler ${status}: ${nachricht || 'unbekannt'}`
}

/** Schickt eine Anfrage an Gemini (Schlüssel im Header, nicht in der Adresse). */
async function frageGemini(teile: unknown[], schema?: object) {
  const schluessel = holeSchluessel()
  if (!schluessel) throw new Error('Kein API-Schlüssel eingetragen (Mehr → Einstellungen).')
  if (!navigator.onLine) throw new Error('Keine Internetverbindung. Trag die Mahlzeit einfach von Hand ein.')

  let antwort: Response
  try {
    antwort = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(holeModell())}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': schluessel },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: teile }],
        generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } : { temperature: 0 },
      }),
    })
  } catch {
    throw new Error('Google ist nicht erreichbar. Prüfe deine Internetverbindung.')
  }
  const daten = await antwort.json().catch(() => ({}))
  if (!antwort.ok) throw new Error(fehlerText(antwort.status, daten?.error?.message ?? ''))
  const text: string | undefined = daten?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text
  if (!text) throw new Error('Gemini hat keine Antwort geliefert (evtl. wurde das Bild blockiert). Bitte von Hand eintragen.')
  return text
}

/** Analysiert ein (bereits verkleinertes) Foto einer Mahlzeit. */
export async function analysiereMahlzeit(bild: Bild): Promise<Analyse> {
  const text = await frageGemini([{ inline_data: { mime_type: bild.mime, data: bild.base64 } }, { text: ANWEISUNG }], ANTWORT_SCHEMA)
  let roh: Record<string, unknown>
  try {
    roh = JSON.parse(text)
  } catch {
    throw new Error('Die Antwort von Gemini war unvollständig. Bitte nochmal versuchen.')
  }
  const zahl = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.round(x) : undefined)
  const bewertung = ['gesund', 'okay', 'ungesund'].includes(String(roh.bewertung)) ? (roh.bewertung as Bewertung) : 'okay'
  return {
    erkannt: roh.erkannt !== false,
    name: String(roh.name ?? '').trim() || 'Mahlzeit',
    bewertung,
    tipp: String(roh.tipp ?? '').trim(),
    portion: String(roh.portion ?? '').trim(),
    naehrwerte: {
      kcal: zahl(roh.kcal),
      eiweiss: zahl(roh.eiweiss),
      kohlenhydrate: zahl(roh.kohlenhydrate),
      fett: zahl(roh.fett),
      zucker: zahl(roh.zucker),
      ballaststoffe: zahl(roh.ballaststoffe),
    },
  }
}

/** Kurzer Test, ob Schlüssel und Modell funktionieren (für die Einstellungen). */
export async function testeVerbindung(): Promise<string> {
  const text = await frageGemini([{ text: 'Antworte nur mit dem Wort: OK' }])
  return text.trim()
}
