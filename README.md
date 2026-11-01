# FORGE 5 – lokaler Code-Arbeitsraum

Ein Editor mit Live-Vorschau für **eigenen** HTML-, CSS- und JavaScript-Code. Alles steckt in einer einzigen Datei (`index.html`, ca. 527 KB, CodeMirror 6 eingebettet). Es gibt keinen Server, keinen API-Key und kein CDN. Gespeichert wird nur im Browser.

Live: https://hazeberry.github.io/FORGE-Sandbox/

> **Kurz und ehrlich:** FORGE ist ein Arbeitsraum für Code, dem du vertraust. Es ist **keine** Sicherheitsumgebung für fremden oder bösartigen Code. Es gibt zwei bekannte Wege, auf denen Code aus der Vorschau trotz Sperren Daten ins Netz schicken kann (siehe „Bekannte Grenzen“). Wer unbekannten Code prüfen will, braucht eine VM oder einen eigenen Browser ohne Netzwerk.

## Betriebsarten

| Modus | Wofür | Was gesperrt ist | Was trotzdem möglich ist |
|---|---|---|---|
| **HTML ohne JavaScript** (Standard) | HTML/CSS ansehen | Skripte, Event-Handler, Formulare, Popups | `<link rel="prerender">` löst einen Netzwerk-Request aus |
| **JavaScript im Worker** | Berechnungen, Konsolentests | DOM, Speicher, Netzwerk (fetch, XHR, WebSocket, WebRTC) | Rechenlast; nach 5 s wird der Lauf beendet |
| **HTML + JavaScript** | eigene interaktive Seiten | externe Ressourcen, fetch, eval, Zugriff auf Editor und Speicher | WebRTC und `prerender` erreichen das Netz; eine Endlosschleife kann den Tab blockieren |

Es startet nie etwas automatisch, auch kein gespeicherter Code. Der DOM-Modus verlangt eine ausdrückliche Bestätigung. Ein Moduswechsel stoppt den laufenden Code.

## Bekannte Grenzen

Diese Punkte wurden am 01.11.2026 in Headless-Chromium 153.0.8010.12 nachgestellt.

**Netzwerk**
- **`<link rel="prerender">` umgeht die CSP.** Das betrifft den statischen Modus und den DOM-Modus. Im statischen Modus kann HTML beim Ansehen einen Request auslösen (z. B. die IP-Adresse verraten). Im DOM-Modus kann ein Skript Daten in die URL packen. Das Ziel bekam im Test den Request samt Parametern.
- **WebRTC funktioniert im DOM-Modus.** Ein `RTCPeerConnection` mit STUN-Server sendet UDP-Pakete an einen frei wählbaren Host. Ob sich darüber Daten über den Hostnamen (DNS) ausleiten lassen, wurde nicht vorgeführt; es liegt nahe.
- **Dicht waren in meinen Tests:** Bilder, Stylesheets, `@import`/`url()`/`@font-face`, iframes, Skripte, fetch, WebSocket, EventSource, dynamischer Import, externe Worker, `importScripts`, XHR im Worker, Formulare, `a[ping]`, Meta-Refresh, Navigation, `window.open`, video/audio/object/embed, preconnect, dns-prefetch, prefetch, preload, modulepreload und speculationrules. `sendBeacon` meldet „true“, es kam aber nichts an.
- `security-test.mjs` beobachtet nur HTTPS-Anfragen über Playwright-Routing und hat keine Pass/Fail-Bedingung. Die Netzwerk-Grenzen prüft stattdessen `known-limits.mjs` gegen lokale HTTP- und UDP-Lauscher: Kanäle, die dicht sein müssen, lassen den Test bei einem Treffer fehlschlagen. Die oben genannten Lücken werden nur gemeldet.

**Stabilität**
- Der DOM-Modus läuft im selben Prozess wie der Editor. Eine Endlosschleife kann den ganzen Tab blockieren, und „Stop“ greift dann nicht.
- Der Worker hat ein festes Zeitlimit von 5 Sekunden (Wanduhr), aber keine Speicherobergrenze. Das Limit beendet auch Skripte mit längeren Timern.
- Die Konsole ist vom Nutzercode beeinflussbar und kein Prüfprotokoll. Die Ausgabe ist auf 50 Nachrichten pro Sekunde, 4.000 Zeichen pro Nachricht und 200 sichtbare Zeilen begrenzt.

**Konsole (Funktionsmängel)**
- `console.log(new Error("x"))` zeigt `{}`. Dasselbe gilt für Map und Set. `undefined` erscheint als leerer Text, BigInt als „[Nicht serialisierbar]“.
- `console.table`, `console.dir`, `console.debug` und `console.assert` werden nicht angezeigt.
- Im Worker-Modus bleiben `Promise.reject(...)` und Fehler in `async`-Funktionen ohne Ausgabe. Im DOM-Modus werden sie angezeigt.

**Speicher**
- Dokument und Verlauf liegen unverschlüsselt in `localStorage` (Schlüssel `forge5-document`, `forge5-history`): bis 1 Mio. Zeichen pro Dokument, bis 20 Schnappschüsse, insgesamt ca. 3 Mio. Zeichen.
- **Auf GitHub Pages teilt sich FORGE die Origin `hazeberry.github.io` mit allen anderen Seiten desselben Kontos.** Diese Seiten können den gespeicherten Code lesen. Bei eigener (Sub-)Domain wäre das getrennt.
- Bei voller Browserablage erscheint eine Fehlermeldung. Der Export ist die zusätzliche Sicherung.

**Hosting**
- GitHub Pages erlaubt keine eigenen HTTP-Header. Die CSP steht deshalb im `<meta>`-Tag. `frame-ancestors` lässt sich so nicht setzen, die Seite kann daher von fremden Seiten eingebettet werden.

**Was nicht getestet wurde:** Firefox, Safari, echte Mobilgeräte, andere Chromium-Versionen, GPU-/Speicherlast.

## Empfehlung nach Risiko

| Situation | Empfehlung |
|---|---|
| Eigener Code, eigene Seiten | Alle Modi sind in Ordnung. |
| Fremder Code ohne DOM | Nur der Worker-Modus. |
| Fremdes HTML ansehen | Besser in einem separaten Browser ohne Netz; der statische Modus kann über `prerender` einen Request auslösen. |
| Fremdes HTML mit JavaScript, Schadcode, vertrauliche Daten | **Nicht in FORGE.** VM oder isolierter Browser ohne Netzwerk verwenden. |

Keine Zugangsdaten, Schlüssel oder vertraulichen Inhalte in den Editor einfügen, wenn du unsicher bist, welcher Code später läuft.

## Hinweis zu älteren Versionen

FORGE 4.4 enthielt eine optionale KI-Analyse mit Anthropic-API-Key. Diese Funktion gibt es in FORGE 5 **nicht mehr**. Ein damals gespeicherter Key (`forge_api_key`) bleibt aber im Browser stehen, FORGE 5 liest und löscht ihn nicht. Wer ihn eingegeben hat, entfernt ihn über die Entwicklerwerkzeuge (Anwendung → Lokaler Speicher → `hazeberry.github.io`) oder erzeugt in der Anthropic-Konsole einen neuen Key und widerruft den alten. Dokumente aus älteren Versionen lassen sich über Export und „Öffnen“ übernehmen.

## Editor

CodeMirror 6, lokal gebündelt: Syntaxfarben, Zeilennummern, Faltung, Klammermarkierung, Einrückung, Undo/Redo, Suchen/Ersetzen (inkl. Regex). Strg/⌘+Enter startet, Strg/⌘+F sucht. Escape, dann Tab verlässt den Editor. Schriftgröße, Zeilenumbruch, Vollbild (gleiche Vorschau, gleicher Zustand), mobile Einzelansichten, Import/Export.

## Selbst bauen und prüfen

```
npm ci --ignore-scripts
npm run build           # erzeugt dist/FORGE-5.html
npm test                # 21 Funktions- und Isolationsprüfungen
npm run test:security   # ergänzende Beobachtungen
npm run test:limits     # Netzwerk-Grenzen, siehe oben
```

`index.html` in diesem Repository ist byte-identisch mit dem Build. Der erwartete Hash steht in `SHA256.txt`:

```
SHA256: 01511124f9dc250be1cc74ea093222eac7081a1b5713df93fb97c9e5bbf39087
```

Die Tests brauchen einen Chromium-Browser. Standardmäßig nutzt Playwright seinen eigenen (`npx playwright install chromium`); mit `CHROMIUM_PATH=/pfad/zu/chrome` lässt sich ein anderer angeben. Eine GitHub-Actions-Pipeline (`.github/workflows/ci.yml`) baut bei jedem Push und Pull Request neu, vergleicht den Hash und führt alle Tests aus. Die Tests laufen nur in Chromium; für andere Browser gibt es keinen Nachweis. Die mitgelieferten Ergebnisdateien (`test-results.json`, `security-results.json`) stammen von einem früheren Lauf in Chromium 153.0.8010.0 und sind keine Bürgschaft für den aktuellen Stand.

`legacy/` enthält die Selbsttest-Seite der Version 4.4 (Loop-Guard). Sie passt nicht zu FORGE 5 und bleibt nur zur Dokumentation.

Lizenzen der gebündelten Bibliotheken: `THIRD-PARTY-LICENSES.txt`. Projektlizenz: `LICENSE` (MIT).
