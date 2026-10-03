// Startseite "Heute": setzt alle Karten untereinander zusammen.
import { useLiveQuery } from 'dexie-react-hooks'
import { begruessung, langesDatum } from '../../core/datum'
import { db } from '../../core/db'
import { ladeBeispieldaten, loescheBeispieldaten, gibtBeispieldaten } from '../../core/beispieldaten'
import Seite from '../../core/ui/Seite'
import { Aktivitaet, Habits } from './TagesUebersicht'
import SchnellEintrag from './SchnellEintrag'
import Wochenrueckblick from './Wochenrueckblick'
import Kacheln from './Kacheln'
import { BackupHinweis, GeburtstagsHinweis } from './Hinweise'
import { ErinnerungenWidget, KalenderWidget } from '../kalender/Widgets'
import SyncKnopf from '../kalender/SyncKnopf'

export default function HeuteSeite() {
  // Zeigt entweder "Beispieldaten laden" oder "löschen", je nachdem was gerade da ist.
  const hatDemo = useLiveQuery(gibtBeispieldaten, [])
  const leer = useLiveQuery(async () => (await db.habits.count()) + (await db.workouts.count()) + (await db.stimmung.count()) === 0, [])

  return (
    <Seite titel={begruessung()} untertitel={langesDatum()}>
      {/* Zwei Widgets nebeneinander wie auf dem iPhone-Homescreen */}
      <div className="grid grid-cols-2 gap-3">
        <KalenderWidget />
        <ErinnerungenWidget />
      </div>
      <SyncKnopf />
      <GeburtstagsHinweis />
      <BackupHinweis />
      <Aktivitaet />
      <Habits />
      <SchnellEintrag />
      <Wochenrueckblick />
      <h2 className="mt-2 px-1 text-[22px] font-bold">Bereiche</h2>
      <Kacheln />

      {/* Beispieldaten */}
      {(hatDemo || leer) && (
        <button
          onClick={() => (hatDemo ? loescheBeispieldaten() : ladeBeispieldaten())}
          className="tippbar mt-2 min-h-12 rounded-2xl bg-karte px-4 text-[15px] font-medium text-[#0a84ff]"
        >
          {hatDemo ? 'Beispieldaten löschen' : 'Beispieldaten laden'}
        </button>
      )}
    </Seite>
  )
}
