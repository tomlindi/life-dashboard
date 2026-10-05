# Kurzbefehl „Life Dashboard Export“

Eine Web-App darf nicht direkt auf Apple Health, Kalender oder Erinnerungen zugreifen. Die **Kurzbefehle-App** darf das aber. Der Kurzbefehl sammelt die Daten, baut daraus einen Text im JSON-Format und kopiert ihn in die Zwischenablage. Die App liest ihn dort aus.

**Täglicher Ablauf:** Kurzbefehl antippen → Life Dashboard öffnen → **„Aus Zwischenablage importieren“** → in der kleinen Blase **„Einfügen“** antippen. Fertig.

> ⚠️ Die Namen der Aktionen können je nach iOS-Version leicht abweichen. Teste jeden Block zuerst einzeln mit der Aktion **„Schnellansicht“**, bevor du weitermachst. Wenn etwas nicht passt, schick mir einen Screenshot. Dann passen wir den Import in der App an. Er ist absichtlich großzügig gebaut.

---

## 1. Das JSON-Format (Version 1)

So muss der Text aussehen, den der Kurzbefehl erzeugt. **Alle Blöcke sind optional**: Du kannst mit einem Block anfangen und die anderen später ergänzen.

> **Auch einfacher geht's:** Die App akzeptiert außerdem **ein JSON-Objekt pro Zeile** (leere Zeilen sind egal), ein **Array** `[{…},{…}]` oder **Objekte direkt hintereinander**. Einzelne Einträge ordnet sie selbst zu: mit `titel` und `start` → Termin, nur `titel` → Erinnerung, `art` und `start` → Workout, `anzahl` → Schritte, `kg` → Gewicht, `stunden`/`stadium` → Schlaf. Eindeutig wird es mit einem Feld `"typ"`, z. B. `{"typ":"termin","titel":"Mathe","start":"…"}`.
> Passt etwas nicht, zeigt die App die kaputte Zeile und die ersten 200 Zeichen der Zwischenablage an. Typografische Anführungszeichen („ “ ”), die iOS beim Tippen setzt, werden automatisch repariert.

> ⚠️ **Wichtig: Vor „In Zwischenablage kopieren“ immer „Text kombinieren“ (Trennzeichen: Neue Zeile).** Kopierst du direkt die *Wiederholungsergebnisse* (eine Liste), legt iOS jeden Termin als eigenen Zwischenablage-Eintrag ab. Life liest inzwischen alle Einträge zusammen, aber nicht jede iOS-Version gibt sie heraus. Mit „Text kombinieren“ ist es immer genau ein Text, und es kommen garantiert alle Termine an.

Beispiel „ein Objekt pro Zeile“ (z. B. direkt aus „Kalenderereignisse suchen“ → „Wiederholen mit jedem“ → „Text“ → „Text kombinieren“ mit **Neue Zeile**):
```
{"titel":"Mathe","start":"2026-10-06T08:00:00+02:00","ende":"2026-10-06T09:30:00+02:00","kalender":"Schule"}
{"titel":"Gym","start":"2026-10-06T17:30:00+02:00","kalender":"Sport"}
```

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

### Block E: Termine (nächste 60 Tage, alle Kalender)

1. **„Kalenderereignisse suchen“**
   - Filter: **Startdatum** *ist in den nächsten* **60 Tagen** (so ist die Monatsansicht in Life gefüllt)
   - Keinen Kalender-Filter setzen, dann werden **alle Kalender** genommen
   - Sortieren nach: Startdatum
2. **„Wiederholen mit jedem“** → zuerst Aktion **„Text ersetzen“**: in **Wiederholungsobjekt › Titel** ersetze `"` durch `'`. Damit gehen Anführungszeichen im Titel nicht kaputt. Dann **„Text“**:
   ```
   {"titel":"[Geänderter Text]","start":"[… › Startdatum, ISO 8601]","ende":"[… › Enddatum, ISO 8601]","ort":"[… › Ort]","kalender":"[… › Kalender]","ganztaegig":"[… › Ist ganztägig]"}
   ```
3. **„Text kombinieren“** mit `,` → umbenennen in `Termine`

### Block F: Offene Erinnerungen

1. **„Erinnerungen suchen“**: Filter **Ist erledigt** *ist* **falsch** (also: nicht erledigt)
2. **„Wiederholen mit jedem“** → **„Text ersetzen“** (`"` → `'` im Titel) → **„Text“**:
   ```
   {"titel":"[Geänderter Text]","faellig":"[… › Fälligkeitsdatum, ISO 8601]","liste":"[… › Liste]","prioritaet":"[… › Priorität]"}
   ```
   Falls es „Liste“ oder „Priorität“ bei dir nicht gibt, lass den Teil einfach weg.
3. **„Text kombinieren“** mit `,` → umbenennen in `Aufgaben`

### Zum Schluss: alles zusammensetzen

1. Aktion **„Text“** mit diesem Inhalt (die Namen in [ ] sind die umbenannten Variablen):
   ```
   {"version":1,"termineTage":60,"schritte":[[Schritte]],"workouts":[[Workouts]],"schlaf":[[Schlaf]],"gewicht":[[Gewicht]],"termine":[[Termine]],"aufgaben":[[Aufgaben]]}
   ```
   `"termineTage":60` sagt der App, dass du 60 Tage abfragst. Termine in diesem Zeitraum, die nicht mehr in Apple stehen, entfernt die App.
   Achtung: Jede Variable steht **innerhalb** von eckigen Klammern `[ ]`. Das sind die JSON-Listen.
2. Aktion **„In Zwischenablage kopieren“**
3. Optional: Aktion **„Mitteilung anzeigen“**: „Daten kopiert – jetzt Life öffnen und importieren“

**Erster Start:** iOS fragt einmal, ob der Kurzbefehl auf Health, Kalender und Erinnerungen zugreifen darf. Erlaube alles (bei Health: die Kategorien Schritte, Workouts, Schlaf, Gewicht).

**Testen:** Füge vor „In Zwischenablage kopieren“ kurz eine **„Schnellansicht“** ein. Dann siehst du den Text. Kopiere ihn notfalls und füge ihn in der App unter **Mehr → Daten importieren → Text einfügen** ein. Dort bekommst du eine verständliche Fehlermeldung, falls etwas nicht stimmt.

---

## 2b. Kurzbefehl „Life Sync“ (Abgleich in beide Richtungen)

Damit Termine und Erinnerungen, die du **in Life** anlegst, änderst oder abhakst, auch in Apple ankommen, gibt es einen zweiten Kurzbefehl. Life startet ihn selbst, wenn du auf **„🔄 Mit Apple abgleichen“** tippst, und übergibt ihm die Änderungen, zum Beispiel:

```json
{ "aktionen": [
  { "typ": "termin", "neu": { "titel": "Nachhilfe", "start": "2026-10-08T15:00:00.000Z", "ende": "2026-10-08T16:00:00.000Z", "ort": "Bibliothek" } },
  { "typ": "termin", "loeschen": { "titel": "Gym", "start": "2026-10-09T15:30:00.000Z" } },
  { "typ": "erinnerung", "erledigt": { "titel": "Vokabeln Kapitel 5" } },
  { "typ": "erinnerung", "neu": { "titel": "Referat üben", "faellig": "2026-10-10", "liste": "Schule" } }
] }
```
Ändern = altes löschen und neues anlegen. Am Ende ruft „Life Sync“ den Export-Kurzbefehl auf, damit alle aktuellen Daten zurück in die Zwischenablage kommen.

> ⚠️ Der Kurzbefehl muss **genau „Life Sync“** heißen, sonst findet Life ihn nicht. Der Export-Kurzbefehl muss **„Life Dashboard Export“** heißen.

### Aufbau
**Kurzbefehle → + → Name „Life Sync“**. Unten auf **ⓘ** tippen und **„Kurzbefehl-Eingabe empfangen“** mit dem Typ **Text** einschalten.

1. **„Wörterbuch abrufen“** von **Kurzbefehl-Eingabe**
2. **„Wörterbuchwert abrufen“**: Schlüssel `aktionen` → umbenennen in `Aktionen`
3. **„Wiederholen mit jedem“** in `Aktionen`. Darin:
   1. **„Wörterbuchwert abrufen“** `typ` von *Wiederholungsobjekt*
   2. **„Wenn“** *Wörterbuchwert* **ist** `termin`:
      - **Löschen:** **„Wörterbuchwert abrufen“** `loeschen` (von *Wiederholungsobjekt*) → **„Wenn“** *hat beliebigen Wert*:
        - `titel` und `start` daraus abrufen → **„Datum abrufen“** aus `start`
        - **„Kalenderereignisse suchen“**: *Titel ist* [titel] und *Startdatum ist* [Datum], Limit 1
        - **„Ereignisse entfernen“** (in den Optionen die Bestätigung ausschalten, sonst fragt iOS jedes Mal)
      - **Neu:** **„Wörterbuchwert abrufen“** `neu` → **„Wenn“** *hat beliebigen Wert*:
        - `titel`, `start`, `ende`, `ort` abrufen, Start und Ende jeweils mit **„Datum abrufen“** umwandeln
        - **„Neues Ereignis hinzufügen“**: Titel, Startdatum, Enddatum, Ort einsetzen. Kalender: dein Standardkalender.
   3. **„Sonst wenn“** *Wörterbuchwert* **ist** `erinnerung`:
      - **Erledigt:** `erledigt` abrufen → Wenn vorhanden: `titel` abrufen → **„Erinnerungen suchen“** *Titel ist* [titel], *Ist erledigt ist falsch*, Limit 1 → **„Erinnerung bearbeiten“**: **Ist erledigt = an**
      - **Wieder offen:** `wiederOffen` abrufen → wie oben, aber *Ist erledigt ist wahr* suchen und **Ist erledigt = aus**
      - **Löschen:** `loeschen` abrufen → **„Erinnerungen suchen“** *Titel ist* [titel] → **„Erinnerungen entfernen“**
      - **Neu:** `neu` abrufen → `titel`, `faellig` abrufen → **„Erinnerung hinzufügen“**: Titel, Fälligkeitsdatum (über „Datum abrufen“), Liste: deine Standardliste
4. Nach „Ende der Wiederholung“: **„Kurzbefehl ausführen“** → **Life Dashboard Export**
5. Optional: **„Mitteilung anzeigen“**: „Abgeglichen – zurück zu Life und Importieren tippen“

Die Aktion „Erinnerung bearbeiten“ heißt je nach iOS-Version auch **„Erinnerungsdetail festlegen“**.

### Ablauf im Alltag
1. In Life auf **„🔄 Mit Apple abgleichen“** tippen. Die Kurzbefehle-App öffnet sich und erledigt alles.
2. Oben links auf **„◀ Life“** tippen (oder zurückwischen).
3. Life zeigt **„Jetzt die aktuellen Apple-Daten übernehmen“** → **Importieren** → **Einfügen**.

Einträge mit ⏳ sind in Life geändert, aber noch nicht von Apple bestätigt. Nach dem Import verschwindet das ⏳.

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
