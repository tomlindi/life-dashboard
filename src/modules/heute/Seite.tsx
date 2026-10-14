// Startseite "Heute": setzt die Karten untereinander zusammen.
// Welche Karten in welcher Reihenfolge erscheinen, stellst du unter Einstellungen → Heute anpassen ein (karten.ts).
import { Fragment, type ReactNode } from 'react'
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
import { SyncRueckkehr, SyncSymbol } from '../kalender/SyncKnopf'
import HealthKacheln from './HealthKacheln'
import FaelligeAufgaben from './FaelligeAufgaben'
import NaechsteKlausur from './NaechsteKlausur'
import FokusBanner from '../fokus/Banner'
import HobbyBanner from '../hobbys/Banner'
import { useHeuteKarten, type KartenId } from './karten'

/** Was zu jeder Karte gehört. */
const KARTEN: Record<KartenId, () => ReactNode> = {
  timer: () => (
    <>
      <FokusBanner />
      <HobbyBanner />
    </>
  ),
  // Zwei Widgets nebeneinander wie auf dem iPhone-Homescreen
  widgets: () => (
    <div className="grid grid-cols-2 gap-3">
      <KalenderWidget />
      <ErinnerungenWidget />
    </div>
  ),
  health: () => <HealthKacheln />,
  klausur: () => <NaechsteKlausur />,
  aufgaben: () => <FaelligeAufgaben />,
  hinweise: () => (
    <>
      <GeburtstagsHinweis />
      <BackupHinweis />
    </>
  ),
  aktivitaet: () => <Aktivitaet />,
  habits: () => <Habits />,
  schnell: () => <SchnellEintrag />,
  rueckblick: () => <Wochenrueckblick />,
  bereiche: () => (
    <>
      <h2 className="mt-2 px-1 text-[22px] font-bold">Bereiche</h2>
      <Kacheln />
    </>
  ),
}

export default function HeuteSeite() {
  // Zeigt entweder "Beispieldaten laden" oder "löschen", je nachdem was gerade da ist.
  const hatDemo = useLiveQuery(gibtBeispieldaten, [])
  const leer = useLiveQuery(async () => (await db.habits.count()) + (await db.workouts.count()) + (await db.stimmung.count()) === 0, [])
  const [karten] = useHeuteKarten()

  return (
    <Seite titel={begruessung()} untertitel={langesDatum()} rechts={<SyncSymbol />}>
      {/* Zurück aus "Life Sync"? Dann hier importieren */}
      <SyncRueckkehr />
      {karten
        .filter((k) => k.an)
        .map((k) => (
          <Fragment key={k.id}>{KARTEN[k.id]()}</Fragment>
        ))}

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
