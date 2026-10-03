# App online stellen (GitHub Pages) und aufs iPhone holen

PWAs brauchen **HTTPS**. GitHub Pages liefert das kostenlos. Danach läuft es so: Du änderst etwas am Code, führst `git push` aus, und nach ca. 1 Minute ist die neue Version online. Den Rest erledigt `.github/workflows/deploy.yml`.

## Einmalig einrichten

### 1. GitHub-Account
Auf **github.com** einen kostenlosen Account anlegen (falls noch nicht geschehen).

### 2. Git sagen, wer du bist
Im Terminal (im Projektordner), mit deinem Namen und deiner GitHub-E-Mail:
```bash
git config --global user.name "Dein Name"
git config --global user.email "deine@email.de"
```

### 3. Leeres Repository auf GitHub anlegen
github.com → oben rechts **+** → **New repository**
- Name: `life-dashboard`
- **Public** (GitHub Pages ist für private Repos nur mit Bezahl-Account möglich. Deine *Daten* sind trotzdem privat, die liegen nur auf deinem iPhone. Öffentlich ist nur der Code.)
- **Kein** README, keine .gitignore hinzufügen → **Create repository**

### 4. Code hochladen
Im Projektordner (`C:\Users\tomli\Claude\life-dashboard`). Ersetze `DEINNAME` durch deinen GitHub-Benutzernamen:
```bash
git init -b main
git add .
git commit -m "Life Dashboard: erste Version"
git remote add origin https://github.com/DEINNAME/life-dashboard.git
git push -u origin main
```
Beim ersten `git push` öffnet sich ein Browserfenster zum Anmelden bei GitHub. Das ist der Git Credential Manager, der bei Git für Windows dabei ist.

### 5. GitHub Pages einschalten
Im Repository auf GitHub: **Settings** → links **Pages** → bei **Source** „**GitHub Actions**“ wählen.
Dann im Reiter **Actions** zuschauen: Nach ca. 1 Minute ist der Lauf grün. Die App ist dann erreichbar unter:

**https://DEINNAME.github.io/life-dashboard/**

> Falls der erste Lauf vor dem Einschalten von Pages fehlgeschlagen ist: Actions → den Lauf öffnen → **Re-run all jobs**.

## Aufs iPhone installieren

1. Die Adresse oben in **Safari** öffnen (wichtig: Safari, nicht Chrome).
2. Unten auf **Teilen** (Quadrat mit Pfeil) tippen.
3. **„Zum Home-Bildschirm“** → Name „Life“ → **Hinzufügen**.
4. Die App vom Homescreen starten. Sie läuft jetzt im Vollbild, ohne Safari-Leiste, und funktioniert auch offline.
5. Gleich als Erstes: **Mehr → Backup & Daten → Backup erstellen** ausprobieren und in iCloud Drive sichern.

⚠️ **Wichtig zu wissen:**
- Die Homescreen-App hat ihren **eigenen Speicher**, getrennt von Safari. Daten, die du in Safari eingibst, siehst du nicht in der App. Benutz deshalb immer die Homescreen-App.
- Wenn du die App vom Homescreen löschst, sind die Daten weg. Deshalb regelmäßig Backups machen; die App erinnert dich nach 7 Tagen.

## Updates veröffentlichen

Nach Änderungen am Code:
```bash
git add .
git commit -m "Was ich geändert habe"
git push
```
Die App auf dem iPhone lädt die neue Version beim nächsten Öffnen automatisch. Manchmal braucht es einen zweiten Start.

## Vorher lokal testen

```bash
npm run dev
```
Dann im Browser **http://localhost:5173** öffnen. Mit `--host` (ist schon eingestellt) kannst du die App auch auf dem iPhone im **selben WLAN** über die angezeigte „Network“-Adresse öffnen, z. B. `http://192.168.x.x:5173`. Das ist gut zum Ausprobieren des Layouts. Offline-Modus und Zwischenablage funktionieren dort aber erst mit HTTPS, also nach dem Hosting.
