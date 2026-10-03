# Kurzbefehl „Life Dashboard Export“

Eine Web-App darf nicht direkt auf Apple Health, Kalender oder Erinnerungen zugreifen. Die **Kurzbefehle-App** darf das aber. Der Kurzbefehl sammelt die Daten, baut daraus einen Text im JSON-Format und kopiert ihn in die Zwischenablage. Die App liest ihn dort aus.

**Täglicher Ablauf:** Kurzbefehl antippen → Life Dashboard öffnen → **„Aus Zwischenablage importieren“** → in der kleinen Blase **„Einfügen“** antippen. Fertig.

> ⚠️ Die Namen der Aktionen können je nach iOS-Version leicht abweichen. Teste jeden Block zuerst einzeln mit der Aktion **„Schnellansicht“**, bevor du weitermachst. Wenn etwas nicht passt, schick mir einen Screenshot. Dann passen wir den Import in der App an. Er ist absichtlich großzügig gebaut.

---

## 1. Das JSON-Format (Version 1)

So muss der Text aussehen, den der Kurzbefehl erzeugt. **Alle Blöcke sind optional**: Du kannst mit einem Block anfangen und die anderen später ergänzen.

```json
{
  "version": 1,
  "schritte": [{ "datum": "2026-10-02T00:00:00+02:00", "anzahl": "8421" }],
  "workouts": [{ "art": "Laufen", "start": "2026-10-02T17:30:00+02:00", "ende": "2026-10-02T18:12:00+02:00" }],
  "schlaf":   [{ "start": "2026-10-01T23:10:00+02:00", "ende": "2026-10-02T03:00:00+02:00", "stadium": "Kern" }],
  "gewicht":  [{ "datum": "2026-10-01T07:30:00+02:00", "kg": "68,2" }],
  "termine":  [{ "titel": "Mathe-Klausur", "start": "2026-10-08T08:00:00+02:00", "ende": "2026-10-08T09:30:00+02:00", "ort": "Raum 204" }],
  "aufgaben": [{ "titel": "Referat vorbereiten", "faellig": "2026-10-10T00:00:00+02:00" }]
}
```

Was die App dabei automatisch erledigt:

| Thema | Was die App macht |
|---|---|
| **Zahlen** | Werte mit Komma (`"68,2"`) und als Text in Anführungszeichen werden verstanden. Wir schreiben alle Zahlen in Anführungszeichen, weil iOS auf Deutsch ein Komma statt Punkt benutzt. |
| **Schritte** | Mehrere Werte pro Tag werden addiert. |
| **Schlaf** | Einzelne Phasen werden pro Nacht zusammengerechnet. Überlappungen (Uhr + iPhone) zählen nur einmal, „Im Bett“ und „Wach“ zählen nicht. Die Nacht zählt für den Tag, an dem du aufwachst. Alternativ geht auch `{ "datum": "...", "stunden": "7,5" }`. |
| **Workouts** | Englische und deutsche Namen werden übersetzt (z. B. „Traditional Strength Training“ wird „Gym“, „Running“ wird „Laufen“). Die Dauer wird aus Start und Ende berechnet. Strava-Aktivitäten, die Strava an Health schickt, sind automatisch dabei. |
| **Duplikate** | Jeder Eintrag bekommt eine feste ID (Workout: Startzeit, Termin: Titel + Startzeit, Aufgabe: Titel, Schritte/Schlaf/Gewicht: Datum). Beim erneuten Import wird **aktualisiert statt doppelt angelegt**. |
| **Abgleich** | Termine der nächsten 14 Tage, die nicht mehr im Kalender stehen, werden entfernt. Aufgaben, die in Erinnerungen nicht mehr offen sind, werden in der App abgehakt. |

---

## 2. Den Kurzbefehl bauen

Öffne die App **Kurzbefehle** → **+** (oben rechts) → Name: **Life Dashboard Export**.

Das Prinzip ist für jeden Block gleich:
1. Daten **suchen**.
2. **„Wiederholen mit jedem“**: Für jeden Eintrag eine Textzeile im JSON-Format bauen.
3. Die Zeilen mit **„Text kombinieren“** durch Kommas verbinden.

Am Ende setzt du alles zu einem großen Text zusammen.

### So fügst du eine Eigenschaft ein (wichtig!)
Im Textfeld innerhalb der Wiederholung tippst du auf **„Variable auswählen“** → **„Wiederholungsobjekt“**. Dann tippst du **auf die eingefügte Variable** und wählst die Eigenschaft (z. B. *Startdatum*). Bei Datumsangaben stellst du dort zusätzlich ein:
**Datumsformat: ISO 8601** und **„Zeit einschließen“: an**.

---

### Block A: Schritte (letzte 7 Tage)

1. Aktion **„Gesundheitsproben suchen“**
   - Filter: **Typ** *ist* **Schritte**
   - Filter hinzufügen: **Startdatum** *ist in den letzten* **7 Tagen**
   - **Gruppieren nach: Tag** (falls vorhanden; sonst weglassen, die App addiert selbst)
2. Aktion **„Wiederholen mit jedem“** (Eingabe: Gesundheitsproben)
   - Darin Aktion **„Text“** mit genau diesem Inhalt (die Teile in [ ] sind Variablen, siehe oben):
     ```
     {"datum":"[Wiederholungsobjekt › Startdatum, ISO 8601]","anzahl":"[Wiederholungsobjekt › Wert]"}
     ```
3. Nach „Ende der Wiederholung“: Aktion **„Text kombinieren“**
   - Eingabe: **Wiederholungsergebnisse**, Trennzeichen: **Eigenes** → `,` (nur ein Komma)
4. Tippe die Ausgabe lange an → **„Umbenennen“** → `Schritte`

### Block B: Workouts (letzte 7 Tage, inkl. Gym und Strava)

1. **„Gesundheitsproben suchen“**: Typ *ist* **Workouts**, Startdatum *ist in den letzten* **7 Tagen**
2. **„Wiederholen mit jedem“** → **„Text“**:
   ```
   {"art":"[Wiederholungsobjekt › Name]","start":"[… › Startdatum, ISO 8601]","ende":"[… › Enddatum, ISO 8601]"}
   ```
   Für „art“ nimm die Eigenschaft, die die Sportart zeigt. Je nach iOS heißt sie **Name**, **Typ** oder **Workout-Typ**. In der Schnellansicht siehst du, welche passt.
3. **„Text kombinieren“** mit `,` → umbenennen in `Workouts`

### Block C: Schlaf (letzte 7 Tage)

1. **„Gesundheitsproben suchen“**: Typ *ist* **Schlafanalyse**, Startdatum *ist in den letzten* **8 Tagen**
2. **„Wiederholen mit jedem“** → **„Text“**:
   ```
   {"start":"[… › Startdatum, ISO 8601]","ende":"[… › Enddatum, ISO 8601]","stadium":"[… › Wert]"}
   ```
3. **„Text kombinieren“** mit `,` → umbenennen in `Schlaf`

### Block D: Gewicht (letzte 7 Tage)

1. **„Gesundheitsproben suchen“**: Typ *ist* **Gewicht**, Startdatum *ist in den letzten* **7 Tagen**
2. **„Wiederholen mit jedem“** → **„Text“**:
   ```
   {"datum":"[… › Startdatum, ISO 8601]","kg":"[… › Wert]"}
   ```
3. **„Text kombinieren“** mit `,` → umbenennen in `Gewicht`

### Block E: Termine (nächste 14 Tage, alle Kalender)

1. **„Kalenderereignisse suchen“**
   - Filter: **Startdatum** *ist in den nächsten* **14 Tagen**
   - Keinen Kalender-Filter setzen, dann werden **alle Kalender** genommen
   - Sortieren nach: Startdatum
2. **„Wiederholen mit jedem“** → zuerst Aktion **„Text ersetzen“**: in **Wiederholungsobjekt › Titel** ersetze `"` durch `'`. Damit gehen Anführungszeichen im Titel nicht kaputt. Dann **„Text“**:
   ```
   {"titel":"[Geänderter Text]","start":"[Wiederholungsobjekt › Startdatum, ISO 8601]","ende":"[… › Enddatum, ISO 8601]","ort":"[… › Ort]"}
   ```
3. **„Text kombinieren“** mit `,` → umbenennen in `Termine`

### Block F: Offene Erinnerungen

1. **„Erinnerungen suchen“**: Filter **Ist erledigt** *ist* **falsch** (also: nicht erledigt)
2. **„Wiederholen mit jedem“** → **„Text ersetzen“** (`"` → `'` im Titel) → **„Text“**:
   ```
   {"titel":"[Geänderter Text]","faellig":"[Wiederholungsobjekt › Fälligkeitsdatum, ISO 8601]"}
   ```
3. **„Text kombinieren“** mit `,` → umbenennen in `Aufgaben`

### Zum Schluss: alles zusammensetzen

1. Aktion **„Text“** mit diesem Inhalt (die Namen in [ ] sind die umbenannten Variablen):
   ```
   {"version":1,"schritte":[[Schritte]],"workouts":[[Workouts]],"schlaf":[[Schlaf]],"gewicht":[[Gewicht]],"termine":[[Termine]],"aufgaben":[[Aufgaben]]}
   ```
   Achtung: Jede Variable steht **innerhalb** von eckigen Klammern `[ ]`. Das sind die JSON-Listen.
2. Aktion **„In Zwischenablage kopieren“**
3. Optional: Aktion **„Mitteilung anzeigen“**: „Daten kopiert – jetzt Life öffnen und importieren“

**Erster Start:** iOS fragt einmal, ob der Kurzbefehl auf Health, Kalender und Erinnerungen zugreifen darf. Erlaube alles (bei Health: die Kategorien Schritte, Workouts, Schlaf, Gewicht).

**Testen:** Füge vor „In Zwischenablage kopieren“ kurz eine **„Schnellansicht“** ein. Dann siehst du den Text. Kopiere ihn notfalls und füge ihn in der App unter **Mehr → Daten importieren → Text einfügen** ein. Dort bekommst du eine verständliche Fehlermeldung, falls etwas nicht stimmt.

---

## 3. Noch einfacher machen

- **Auf den Homescreen legen:** Kurzbefehl lange drücken → **Teilen** → **„Zum Home-Bildschirm“**. Lege ihn direkt neben das Life-Dashboard-Icon.
- **Rückseite tippen:** *Einstellungen → Bedienungshilfen → Tippen → Auf Rückseite tippen → Doppeltippen* → deinen Kurzbefehl wählen. Dann reicht zweimal hinten aufs iPhone tippen.
- **Automatisch jeden Morgen:** *Kurzbefehle → Automation → Neue Automation → Tageszeit* (z. B. 7:30) → **„Sofort ausführen“** → deinen Kurzbefehl. Danach musst du nur noch die App öffnen und „Importieren“ tippen.
  ⚠️ Health-Daten sind gesperrt, solange das iPhone gesperrt ist. Wähle deshalb eine Uhrzeit, zu der du das Handy meist schon benutzt.

**Warum nicht ganz automatisch?** Eine Web-App kann nicht im Hintergrund laufen und nicht selbst auf Health zugreifen. Auch das Antippen von „Einfügen“ ist eine Schutzfunktion von iOS, die sich nicht abschalten lässt. Zwei Taps sind deshalb das Minimum.

---

## 4. Noten aus Notan (CSV)

In der App: **Schule → Noten importieren (CSV)**. Falls Notan einen CSV- oder Excel-Export hat, exportiere die Noten und öffne die Datei. Erkannt werden die Spalten **Fach** und **Punkte** (oder **Note** 1–6, wird umgerechnet), optional **Art**, **Gewicht**, **Datum**. Eine Vorlage liegt in `docs/noten-vorlage.csv`.

Falls Notan keinen Export hat, trag die Noten in der App von Hand ein. Mit den Punkte-Knöpfen dauert das pro Note etwa 3 Taps. Oder du überträgst sie einmal in die Vorlage (z. B. in Numbers oder Excel, als CSV speichern) und importierst sie.
