# Änderungen

Neueste Version steht oben. Jede Version hat einen Git-Tag (z. B. `v1.0.0`).
Versionsnummern: neue Funktion → 1.0.0 wird 1.1.0, Fehlerkorrektur → 1.1.0 wird 1.1.1.
Die aktuelle Version steht in der App ganz unten unter Mehr → Einstellungen.

**Zu einer alten Version zurück:**
- Nur anschauen (am PC): `git checkout v1.0.0`, danach `npm run dev`. Zurück zur neuesten mit `git checkout main`.
- Online wirklich zurücksetzen: `git revert --no-edit v1.0.0..HEAD` und `git push`. Dabei entstehen neue Commits, die alles seit v1.0.0 rückgängig machen. Der Verlauf bleibt erhalten, und GitHub Pages baut automatisch die alte Version.

## 1.0.0 – 13.10.2026

**Versionsnummern.** Ab jetzt hat die App Versionen. Die Nummer steht klein unten in den Einstellungen, jede Version bekommt einen Git-Tag. Dieser Stand ist 1.0.0 und umfasst alles bis hierher.

**Tab-Leiste wie bei Apple.** Auf Heute, Mehr und den Bereichen, die selbst in der Leiste stehen, ist die Leiste sichtbar. Auf allen anderen Seiten und beim Runterscrollen fährt sie weich nach unten weg. Sie kommt zurück beim Hochscrollen, bei „Zurück“ und beim Hochwischen knapp über dem Home-Balken, wo dann ein kleiner Griff zu sehen ist. Jede Unterseite hat jetzt oben links „‹ Zurück“.

**Kalenderfarben.** Im Kalender steht unter jedem Tag ein farbiger Punkt pro Kalender (höchstens 3, sonst „+“), darunter eine Legende. Neue Kalender bekommen automatisch die nächste freie Apple-Farbe. Unter Mehr → Einstellungen → Kalenderfarben kannst du sie ändern. Die gleiche Farbe gibt es als Streifen an den Terminen.

**Life Sync löscht gelöschte Termine.** Jeder Import gilt als vollständiger Stand von heute 00:00 bis heute + 14 Tage (einstellbar unter Einstellungen → Life Sync: Termine). Importierte Termine, die dort fehlen, werden gelöscht. Selbst angelegte und vergangene Termine bleiben. Ohne Termine im Import oder bei unlesbaren Zeilen wird zur Sicherheit nichts gelöscht. Nach dem Import siehst du „X neu, Y aktualisiert, Z gelöscht“.

**Apple Health über Life Sync.** Zeilen mit `"typ":"health"` werden importiert: Schritte, Schlafphasen, Gewicht, Größe, Körperfett, Wasser, Alkohol, Kalorien und Makros. Zahlen mit Komma oder Einheit („72,4 kg“) werden verstanden, doppelte Werte ersetzt, unbekannte Arten gespeichert und gemeldet. Kaputte Zeilen werden übersprungen und mit Zeilennummer angezeigt, statt den ganzen Import abzubrechen.

**Health in der App.** Schlaf zeigt jetzt Phasen als gestapelte Balken und einen eigenen Schlafindex (0–100). Ernährung zeigt Kalorien und Makros aus Health, ohne die Foto-Schätzungen dazuzuzählen, dazu Wasser (jetzt in ml, 1 Glas = 250 ml) und Alkohol pro Tag und Woche. Neu gibt es den Bereich „Körper“ (Gewicht, KFA, Größe, BMI) und auf Heute drei kleine Kacheln für Schritte, Schlaf und Wasser. Werte aus Health tragen ein kleines Herz.

**Test für den Import.** `npm run test:import` spielt Beispieldaten mit allen Typen durch, auch kaputte Zeilen, in einer nachgebauten Datenbank. Deine echten Daten bleiben dabei unberührt.
