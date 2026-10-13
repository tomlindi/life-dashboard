// DIE LISTE ALLER BEREICHE.
// Einen Bereich ausblenden: Zeile hier löschen (oder mit // auskommentieren).
// Einen neuen Bereich hinzufügen: Ordner in src/modules/ anlegen und hier eintragen.
// Die Reihenfolge bestimmt die Reihenfolge der Kacheln auf der Startseite.
import fitness from './fitness'
import schule from './schule'
import ziele from './ziele'
import gewohnheiten from './gewohnheiten'
import geld from './geld'
import schlaf from './schlaf'
import ernaehrung from './ernaehrung'
import koerper from './koerper'
import freunde from './freunde'
import hobbys from './hobbys'
import fokus from './fokus'
import stimmung from './stimmung'
import type { Modul } from '../core/module'

export const module: Modul[] = [
  fitness,
  schule,
  ziele,
  gewohnheiten,
  geld,
  schlaf,
  ernaehrung,
  koerper,
  freunde,
  hobbys,
  fokus,
  stimmung,
]

/**
 * Standard-Seiten im Dock. Wählbar sind "heute", "kalender", "erinnerungen" und alle Bereiche, höchstens 4.
 * Dazu kommt immer "Mehr". Ändern: Mehr → Einstellungen → Dock-Seiten.
 */
export const STANDARD_TABS = ['heute', 'kalender', 'fitness', 'ziele']
export const MAX_TABS = 4
