# Änderungen

Neueste Version steht oben. Jede Version hat einen Git-Tag (z. B. `v1.0.0`).
Versionsnummern: neue Funktion → 1.0.0 wird 1.1.0, Fehlerkorrektur → 1.1.0 wird 1.1.1.
Die aktuelle Version steht in der App ganz unten unter Mehr → Einstellungen.

**Zu einer alten Version zurück:**
- Nur anschauen (am PC): `git checkout v1.0.0`, danach `npm run dev`. Zurück zur neuesten mit `git checkout main`.
- Online wirklich zurücksetzen: `git revert --no-edit v1.0.0..HEAD` und `git push`. Dabei entstehen neue Commits, die alles seit v1.0.0 rückgängig machen. Der Verlauf bleibt erhalten, und GitHub Pages baut automatisch die alte Version.

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
