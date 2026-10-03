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
import freunde from './freunde'
import hobbys from './hobbys'
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
  freunde,
  hobbys,
  stimmung,
]

/** Die vier Bereiche, die in der unteren Tab-Leiste stehen. Alle anderen sind unter "Mehr". */
export const TAB_IDS = ['fitness', 'schule', 'ziele']
