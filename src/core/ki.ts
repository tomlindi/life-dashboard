// KI-Helfer: schätzt die Nährwerte einer Mahlzeit aus einem Foto (über die Claude-API von Anthropic).
//
// Der API-Schlüssel ist dein eigener (von console.anthropic.com). Er liegt NUR im localStorage
// dieses Geräts – absichtlich nicht in der Datenbank, denn die Datenbank landet im JSON-Backup.
// Das SDK (der offizielle Anthropic-Baustein) wird erst beim ersten Foto nachgeladen
// (dynamischer import), damit die App selbst schnell startet.
import type { BetaMessage, BetaTextBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { Bewertung } from './db'

const SPEICHER_SCHLUESSEL = 'anthropicApiKey'
const MODELL = 'claude-opus-5-5'

// ---------- Schlüssel lesen/speichern (try/catch: im privaten Modus kann localStorage fehlen) ----------

/** Der gespeicherte API-Schlüssel oder '' wenn keiner da ist. */
export function kiSchluessel(): string {
  try {
    return localStorage.getItem(SPEICHER_SCHLUESSEL) ?? ''
  } catch {
    return ''
  }
}

/** Speichert den Schlüssel. Ein leerer Text löscht ihn. */
export function setzeKiSchluessel(schluessel: string) {
  try {
    if (schluessel.trim()) localStorage.setItem(SPEICHER_SCHLUESSEL, schluessel.trim())
    else localStorage.removeItem(SPEICHER_SCHLUESSEL)
  } catch {
    // Kein Speicher verfügbar: dann bleibt die KI eben aus.
  }
}

// ---------- Was die KI zurückgibt ----------

export type Sicherheit = 'hoch' | 'mittel' | 'niedrig'

export interface KiErgebnis {
  name: string // '' = auf dem Foto ist kein Essen zu sehen
  kcal: number
  protein: number // Gramm
  kohlenhydrate: number // Gramm
  fett: number // Gramm
  bewertung: Bewertung
  sicherheit: Sicherheit
  erklaerung: string
}

/**
 * Bauplan der Antwort als JSON-Schema ("structured outputs"): die API sorgt dafür,
 * dass die KI genau diese Felder liefert. Alle Felder sind Pflicht, keine zusätzlichen erlaubt.
 */
export const NAEHRWERT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Kurzer deutscher Name des Gerichts, z. B. "Spaghetti Bolognese". Leer, wenn kein Essen zu sehen ist.' },
    kcal: { type: 'number', description: 'Kalorien der sichtbaren Portion in kcal' },
    protein: { type: 'number', description: 'Protein in Gramm' },
    kohlenhydrate: { type: 'number', description: 'Kohlenhydrate in Gramm' },
    fett: { type: 'number', description: 'Fett in Gramm' },
    bewertung: { type: 'string', enum: ['gesund', 'okay', 'ungesund'] },
    sicherheit: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] },
    erklaerung: { type: 'string', description: 'Ein kurzer deutscher Satz zur wichtigsten Annahme, z. B. zur Portionsgröße' },
  },
  required: ['name', 'kcal', 'protein', 'kohlenhydrate', 'fett', 'bewertung', 'sicherheit', 'erklaerung'],
  additionalProperties: false,
} as const

function auftrag(hinweis?: string): string {
  return [
    'Schätze die Nährwerte der Mahlzeit auf diesem Foto – für die Portion, die zu sehen ist.',
    '- name: kurzer deutscher Name des Gerichts (z. B. "Spaghetti Bolognese").',
    '- kcal, protein, kohlenhydrate, fett: Kalorien in kcal, die anderen Werte in Gramm. Runde sinnvoll (kcal auf 10, Gramm auf ganze Zahlen).',
    '- bewertung: "gesund", "okay" oder "ungesund" – aus Sicht eines Jugendlichen, der viel Sport macht.',
    '- sicherheit: wie sicher deine Schätzung ist ("hoch", "mittel" oder "niedrig").',
    '- erklaerung: ein kurzer deutscher Satz zu deiner wichtigsten Annahme, z. B. zur Portionsgröße.',
    'Getränke zählen auch. Wenn auf dem Foto kein Essen und kein Getränk zu erkennen ist: name "" und alle Zahlen 0.',
    hinweis?.trim() ? `Hinweis vom Nutzer (hat Vorrang vor dem, was du auf dem Foto vermutest): ${hinweis.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

// ---------- Antwort auslesen (getrennt, damit man es ohne echte Anfrage testen kann) ----------

const BEWERTUNGEN: Bewertung[] = ['gesund', 'okay', 'ungesund']
const SICHERHEITEN: Sicherheit[] = ['hoch', 'mittel', 'niedrig']

/** Zahl >= 0, gerundet. Alles Kaputte wird 0. */
const gramm = (x: unknown, stellen = 0) => {
  const n = typeof x === 'number' && Number.isFinite(x) ? Math.max(0, x) : 0
  return Math.round(n * 10 ** stellen) / 10 ** stellen
}

/** Prüft die Antwort der API und macht daraus ein KiErgebnis. Wirft bei Problemen einen deutschen Fehler. */
export function leseAntwort(antwort: Pick<BetaMessage, 'stop_reason' | 'content'>): KiErgebnis {
  if (antwort.stop_reason === 'refusal') throw new Error('Die KI hat dieses Foto abgelehnt. Versuch es mit einem anderen Foto oder trag die Werte von Hand ein.')
  if (antwort.stop_reason === 'max_tokens') throw new Error('Die Antwort der KI wurde abgeschnitten. Versuch es bitte nochmal.')

  const text = antwort.content.find((b): b is BetaTextBlock => b.type === 'text')?.text
  let roh: Record<string, unknown>
  try {
    roh = JSON.parse(text ?? '')
  } catch {
    throw new Error('Die Antwort der KI war unverständlich. Versuch es bitte nochmal.')
  }
  if (!roh || typeof roh !== 'object') throw new Error('Die Antwort der KI war unverständlich. Versuch es bitte nochmal.')

  return {
    name: typeof roh.name === 'string' ? roh.name.trim() : '',
    kcal: gramm(roh.kcal),
    protein: gramm(roh.protein),
    kohlenhydrate: gramm(roh.kohlenhydrate),
    fett: gramm(roh.fett),
    bewertung: BEWERTUNGEN.includes(roh.bewertung as Bewertung) ? (roh.bewertung as Bewertung) : 'okay',
    sicherheit: SICHERHEITEN.includes(roh.sicherheit as Sicherheit) ? (roh.sicherheit as Sicherheit) : 'mittel',
    erklaerung: typeof roh.erklaerung === 'string' ? roh.erklaerung.trim() : '',
  }
}

// ---------- Die eigentliche Anfrage ----------

/**
 * Schickt ein Foto (JPEG als Base64, OHNE "data:"-Anfang) an Claude und bekommt die geschätzten Nährwerte zurück.
 * hinweis: optionaler Zusatz vom Nutzer, z. B. "nur die Hälfte gegessen".
 * Wirft bei Fehlern immer einen Error mit einer deutschen, verständlichen Meldung.
 */
export async function analysiereMahlzeit(bildBase64Jpeg: string, hinweis?: string): Promise<KiErgebnis> {
  const apiKey = kiSchluessel()
  if (!apiKey) throw new Error('Es ist noch kein KI-Schlüssel eingerichtet.')

  let Anthropic: typeof import('@anthropic-ai/sdk').default
  try {
    Anthropic = (await import('@anthropic-ai/sdk')).default
  } catch {
    throw new Error('Die KI konnte nicht geladen werden. Bist du online?')
  }

  // dangerouslyAllowBrowser: die App hat keinen Server, der Schlüssel ist dein eigener und bleibt auf dem Gerät.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 120_000, maxRetries: 1 })

  let antwort: BetaMessage
  try {
    antwort = await client.beta.messages.create({
      model: MODELL,
      max_tokens: 16000,
      // Falls das Modell ablehnt, springt serverseitig automatisch ein Ersatzmodell ein.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: NAEHRWERT_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: bildBase64Jpeg } },
            { type: 'text', text: auftrag(hinweis) },
          ],
        },
      ],
    })
  } catch (e) {
    // Vom genauesten zum allgemeinsten Fehler
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Der KI-Schlüssel stimmt nicht. Trag ihn unter „KI-Schlüssel“ (unter dem Foto-Knopf) neu ein.')
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('Dein KI-Schlüssel hat dafür keine Berechtigung. Schau in dein Konto auf console.anthropic.com.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Zu viele Anfragen – warte kurz und versuch es dann nochmal.')
    if (e instanceof Anthropic.BadRequestError) {
      // 400 hat viele Gründe (kein Guthaben, kaputtes Bild, …). Die echte Meldung steht in e.error.error.message.
      const text = String((e.error as { error?: { message?: string } } | undefined)?.error?.message ?? e.message)
      throw new Error(
        /credit balance/i.test(text)
          ? 'Dein Guthaben auf console.anthropic.com ist aufgebraucht (Billing).'
          : `Die KI hat die Anfrage abgelehnt (400): ${text}`,
      )
    }
    if (e instanceof Anthropic.InternalServerError) throw new Error('Die KI ist gerade überlastet. Versuch es gleich nochmal.')
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new Error('Die KI hat zu lange gebraucht. Versuch es bitte nochmal.')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Keine Internetverbindung zur KI. Prüf dein WLAN oder deine mobilen Daten.')
    if (e instanceof Anthropic.APIError) throw new Error(`Die KI hat einen Fehler gemeldet (${e.status ?? 'unbekannt'}). Versuch es später nochmal.`)
    throw new Error('Unbekannter Fehler bei der KI. Versuch es bitte nochmal.')
  }
  return leseAntwort(antwort)
}
