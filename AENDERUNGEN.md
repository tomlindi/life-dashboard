# Änderungen

Neueste Version steht oben. Jede Version hat einen Git-Tag (z. B. `v1.0.0`).
Versionsnummern: neue Funktion → 1.0.0 wird 1.1.0, Fehlerkorrektur → 1.1.0 wird 1.1.1.
Die aktuelle Version steht in der App ganz unten unter Mehr → Einstellungen.

**Zu einer alten Version zurück:**
- Nur anschauen (am PC): `git checkout v1.0.0`, danach `npm run dev`. Zurück zur neuesten mit `git checkout main`.
- Online wirklich zurücksetzen: `git revert --no-edit v1.0.0..HEAD` und `git push`. Dabei entstehen neue Commits, die alles seit v1.0.0 rückgängig machen. Der Verlauf bleibt erhalten, und GitHub Pages baut automatisch die alte Version.

## 1.8.0 – 14.10.2026

**Hell, Dunkel oder Automatisch.** Unter Mehr → Einstellungen → „Darstellung“ lässt sich die App hell oder dunkel schalten, „Automatisch“ folgt der Einstellung des iPhones. Standard bleibt Dunkel. Die Wahl gilt pro Gerät.

**Notizen.** Neuer Bereich „Notizen“ (unter Mehr, auch als Dock-Seite wählbar) wie in Apple Notizen: Ordner, Suche, Anpinnen, Gruppen nach Datum (Heute, Gestern, Letzte 7 Tage …). Die erste Zeile ist der Titel. Mit dem Checklisten-Knopf werden Zeilen zu abhakbaren Punkten, Enter macht den nächsten Punkt, Enter in einem leeren Punkt beendet die Checkliste. Speichert automatisch. Schnellnotizen von „Heute“ landen im Ordner „Notizen“ und öffnen sich per Tipp.

**Hobby-Timer.** Jedes Hobby hat einen Start-Knopf. Der Timer läuft weiter, wenn die App zu ist, und speichert beim Stoppen Beginn und Ende („14:05–15:20 · 1 h 15 min“). Im aufgeklappten Hobby steht das Zeitprotokoll, und „Zeit nachtragen“ trägt Tag, Beginn und Ende von Hand ein.

**Abschnitte in To-do-Listen.** Projekt-Aufgaben und Listen in Erinnerungen lassen sich mit „Abschnitt hinzufügen“ gliedern. Überschrift antippen = umbenennen, verschieben oder löschen (die Aufgaben bleiben). Aufgaben verschieben: im Projekt nach links wischen → „Abschnitt“, bei Erinnerungen im Detail-Fenster. Abschnitte gibt es nur in Life, Apple bekommt sie nicht. Beim Import bleiben sie erhalten.

**Wasserziel einstellbar.** In Ernährung → Wasser auf „… / 2 l“ tippen (oder in den Einstellungen): 1 bis 20 Gläser à 250 ml. Heute-Kachel und Schnell-Eintrag nutzen dasselbe Ziel.

**Neues App-Icon.** Farbige Segmente um einen Punkt auf hellem Grund. Auf dem iPhone erscheint es nach dem erneuten „Zum Home-Bildschirm“ hinzufügen. `npm run icons` erzeugt die Icons aus `icon.png`.

## 1.7.0 – 13.10.2026

**Klausuren bearbeiten.** Unter Schule → „Anstehende Klausuren“ öffnet ein Tipp die Klausur. Thema, Fach, Datum, Uhrzeit, Raum und Lernstoff lassen sich ändern, löschen geht im selben Formular. Uhrzeit, Raum und Lernstoff sind neu und stehen auch in der Liste. Klausuren aus dem Apple Kalender öffnen das Termin-Blatt, Änderungen gehen per Life Sync an Apple.

**Eigene Seite pro Fach.** Über ein aufgeklapptes Fach → „Fachseite & Notizen ›“ kommst du auf die Seite des Fachs: Schnitt im aktuellen Halbjahr, ein Notizfeld (speichert beim Tippen) und aufklappbar Klausuren, Hausaufgaben und Noten. Klausuren aus dem Kalender werden dem Fach anhand des Titels zugeordnet („Mathe-Klausur“ → Mathematik).

## 1.6.0 – 13.10.2026

**Fokus-Timer.** Neuer Bereich „Fokus“ (unter Mehr, auch als Dock-Seite wählbar) mit Pomodoro (Standard 25 min Fokus, 5 min Pause, nach 4 Runden 15 min lange Pause, alles einstellbar) und einer freien Stoppuhr. Der Timer läuft weiter, wenn die App zu ist. Beim Öffnen wird eine abgelaufene Runde mit ihrer geplanten Länge gespeichert. Die Statistik zeigt heute, diese Woche, den Schnitt pro Tag und die letzten 7 Tage als Balken. Läuft ein Timer, steht oben auf Heute ein Banner.

**Echter iPhone-Timer.** Weil eine Web-App bei gesperrtem iPhone nicht klingeln kann, stellt Life beim Pomodoro-Start über den neuen Kurzbefehl „Life Timer“ einen iPhone-Timer (abschaltbar). Anleitung in docs/KURZBEFEHL.md, Abschnitt 2c.

**Korrektur:** Der Pausen-Timer im Gym sitzt jetzt über dem Dock-Knopf statt ihn zu verdecken.

## 1.5.1 – 13.10.2026

**Mehrtägige Termine an allen Tagen.** Bisher erschien ein Termin über mehrere Tage nur an seinem ersten Tag. Jetzt steht er im Kalender an jedem seiner Tage, mit Punkt und in der Tagesliste. Ganztägige Termine stehen oben mit „Tag 2 von 3“, eine Fahrt von Freitag 20:00 bis Sonntag 10:00 zeigt „ab 20:00“, dann „ganztägig“ und „bis 10:00“. Auch das Kalender-Widget auf Heute zeigt laufende mehrtägige Termine, die schon vor heute begonnen haben.

## 1.5.0 – 13.10.2026

**Filter für langfristige Ziele.** Über den Zielen stehen die Chips Alle, Offen und Erreicht (Erreicht = 100 %). Die Auswahl bleibt gespeichert.

**Zuordnen eingeklappt.** „Termine zuordnen“ und „Erinnerungen zuordnen“ sind beim Öffnen der Seite eingeklappt und zeigen nur die Anzahl. Antippen klappt sie auf.

**Aufgaben wie in Apple Erinnerungen.** Auf der Projektseite haben Aufgaben jetzt kleine Kreise, lange Namen brechen sauber unter dem Text um, und die Trennlinien beginnen erst beim Text. Papierkorb und „+“ in jeder Zeile sind weg: Nach links wischen zeigt „Unteraufgabe“ und „Löschen“. Neue Aufgaben tippst du direkt in die leere Zeile am Ende der Liste, Enter springt zur nächsten.

## 1.4.0 – 13.10.2026

**Projekte filtern und sortieren.** Oben auf der Ziele-Seite stehen die Projekte mit Filter-Chips (Alle, Aktiv, Pausiert, Erledigt, Deadline diese Woche), einer Auswahl „Ziel“ und einem Sortieren-Knopf (Deadline, Fortschritt, Name, Zuletzt bearbeitet, Eigene Reihenfolge). Bei „Eigene Reihenfolge“ hältst du ein Projekt gedrückt und ziehst es. Filter und Sortierung bleiben gespeichert. Jede Zeile zeigt nur Farbe, Name, Fortschrittsring, Deadline und offene Aufgaben.

**Eigene Seite pro Projekt.** Ein Tipp auf ein Projekt öffnet seine Seite mit großem Fortschrittsring, Status, Deadline und Ziel. Über „Bearbeiten“ änderst du Name, Farbe, Status, Deadline und Ziel. Darunter liegen aufklappbare Abschnitte: Aufgaben mit Unteraufgaben (Erledigtes eingeklappt als „3 erledigt ›“, neue Aufgaben direkt unten in der Liste), Termine und Erinnerungen (eingeklappt) und Notizen, die beim Tippen gespeichert werden.

**Ziele aufgeräumt.** Bei jedem Ziel sind die zugeordneten Termine und Erinnerungen eingeklappt und zeigen nur die Anzahl. Antippen klappt sie weich auf, der Pfeil dreht sich mit. Zu einem Ziel zählen auch Termine und Erinnerungen seiner Projekte.

## 1.3.0 – 13.10.2026

**Dock wird ein Knopf.** Statt der Leiste gibt es unten rechts einen runden Glas-Knopf mit dem Symbol der Seite, auf der du gerade bist. Antippen klappt ihn weich zu einer Kapsel mit deinen 4 Dock-Seiten und „Mehr“ auf. Eine Seite außerhalb davon steht zusätzlich ganz außen und ist markiert. Daneben tippen oder nach unten wischen klappt ihn zu. Beim Scrollen wird der Knopf kleiner und durchsichtiger. Das Ausblenden auf Detailseiten und der Griff fallen weg, weil der Knopf immer da ist.

**Dock-Seiten und Knopf links.** Unter Einstellungen → Dock-Seiten wählst du die 4 festen Seiten (jetzt auch Kalender und Erinnerungen) und sortierst sie per Gedrückthalten und Ziehen. Der Schalter „Knopf links“ ist für Linkshänder.

**Zurück-Wischen.** Auf allen Seiten mit Zurück-Knopf geht es jetzt auch zurück, wenn du vom linken Bildschirmrand nach rechts wischst. Das gilt in der Homescreen-App; in Safari macht iOS das schon selbst.

## 1.2.0 – 13.10.2026

**Neues Dock im Stil von iOS 26.** Die Tab-Leiste ist jetzt eine schwebende Glas-Kapsel mit Symbolen und kleiner Beschriftung. Der aktive Tab hat eine helle Kapsel und die Farbe seines Bereichs. Auf den Übersichtsseiten schrumpft das Dock beim Runterscrollen zu einer kleinen runden Kapsel unten links und wird beim Hochscrollen oder Antippen wieder groß, mit leichtem Federeffekt. Auf allen anderen Seiten bleibt es weg und kommt nur über „Zurück“ oder einen Wisch knapp über dem Home-Balken zurück. Scrollen holt es dort nicht mehr hervor.

**Tabs anpassen.** Unter Mehr → Einstellungen → Tabs anpassen wählst du bis zu 4 Einträge fürs Dock (auch „Heute“) und änderst die Reihenfolge. Der 5. Tab ist immer „Mehr“. Bereiche, die nicht im Dock stehen, findest du unter „Mehr“.

## 1.1.0 – 13.10.2026

**Kalender ein- und ausblenden.** Auf der Kalender-Seite gibt es oben den Knopf „Kalender“. Er öffnet ein Blatt mit allen Kalendern: Zeile antippen blendet den Kalender ein oder aus, der farbige Kreis öffnet die 12 Apple-Farben. Ausgeblendete Kalender verschwinden aus Monatsansicht, Punkten, Tagesliste, Legende, dem Kalender-Widget auf Heute und den geplanten Trainings bei Fitness. Ihre Termine bleiben gespeichert und werden weiter mit Apple abgeglichen. Neue Kalender aus Life Sync sind automatisch eingeblendet, und unter dem Knopf steht, wie viele ausgeblendet sind.

## 1.0.0 – 13.10.2026

**Versionsnummern.** Ab jetzt hat die App Versionen. Die Nummer steht klein unten in den Einstellungen, jede Version bekommt einen Git-Tag. Dieser Stand ist 1.0.0 und umfasst alles bis hierher.

**Tab-Leiste wie bei Apple.** Auf Heute, Mehr und den Bereichen, die selbst in der Leiste stehen, ist die Leiste sichtbar. Auf allen anderen Seiten und beim Runterscrollen fährt sie weich nach unten weg. Sie kommt zurück beim Hochscrollen, bei „Zurück“ und beim Hochwischen knapp über dem Home-Balken, wo dann ein kleiner Griff zu sehen ist. Jede Unterseite hat jetzt oben links „‹ Zurück“.

**Kalenderfarben.** Im Kalender steht unter jedem Tag ein farbiger Punkt pro Kalender (höchstens 3, sonst „+“), darunter eine Legende. Neue Kalender bekommen automatisch die nächste freie Apple-Farbe. Unter Mehr → Einstellungen → Kalenderfarben kannst du sie ändern. Die gleiche Farbe gibt es als Streifen an den Terminen.

**Life Sync löscht gelöschte Termine.** Jeder Import gilt als vollständiger Stand von heute 00:00 bis heute + 14 Tage (einstellbar unter Einstellungen → Life Sync: Termine). Importierte Termine, die dort fehlen, werden gelöscht. Selbst angelegte und vergangene Termine bleiben. Ohne Termine im Import oder bei unlesbaren Zeilen wird zur Sicherheit nichts gelöscht. Nach dem Import siehst du „X neu, Y aktualisiert, Z gelöscht“.

**Apple Health über Life Sync.** Zeilen mit `"typ":"health"` werden importiert: Schritte, Schlafphasen, Gewicht, Größe, Körperfett, Wasser, Alkohol, Kalorien und Makros. Zahlen mit Komma oder Einheit („72,4 kg“) werden verstanden, doppelte Werte ersetzt, unbekannte Arten gespeichert und gemeldet. Kaputte Zeilen werden übersprungen und mit Zeilennummer angezeigt, statt den ganzen Import abzubrechen.

**Health in der App.** Schlaf zeigt jetzt Phasen als gestapelte Balken und einen eigenen Schlafindex (0–100). Ernährung zeigt Kalorien und Makros aus Health, ohne die Foto-Schätzungen dazuzuzählen, dazu Wasser (jetzt in ml, 1 Glas = 250 ml) und Alkohol pro Tag und Woche. Neu gibt es den Bereich „Körper“ (Gewicht, KFA, Größe, BMI) und auf Heute drei kleine Kacheln für Schritte, Schlaf und Wasser. Werte aus Health tragen ein kleines Herz.

**Test für den Import.** `npm run test:import` spielt Beispieldaten mit allen Typen durch, auch kaputte Zeilen, in einer nachgebauten Datenbank. Deine echten Daten bleiben dabei unberührt.
