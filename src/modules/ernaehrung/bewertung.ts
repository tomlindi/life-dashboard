// Aussehen der drei Bewertungen (gemeinsam für Ernährungsseite und Foto-Analyse).
import type { Bewertung } from '../../core/db'

export const BEWERTUNG: Record<Bewertung, { emoji: string; farbe: string }> = {
  gesund: { emoji: '🥦', farbe: '#30d158' },
  okay: { emoji: '🍝', farbe: '#ffd60a' },
  ungesund: { emoji: '🍟', farbe: '#ff453a' },
}
