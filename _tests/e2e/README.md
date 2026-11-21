# E2E-Tests: Formulare → Pull Requests (gegen ein Fake-GitHub)

Diese Tests klicken die ➕/✏️-Formulare der gebauten Seite in einem echten (headless) Chrome durch – mit GitHub-Verbindung („Direkt bearbeiten“, `assets/js/github-api.js`) – und prüfen danach, was im **Fake-GitHub** angekommen ist: Branches, Commits, Pull Requests, Dateiinhalte. Kein echtes GitHub, kein Netz, keine npm-Pakete.

Der Ordner beginnt mit `_` und wird deshalb von Jekyll nicht veröffentlicht.

## Ausführen

```bash
_scripts/test_e2e.sh                 # baut die Seite einmal und startet alle Tests (~15 s)
_scripts/test_e2e.sh --no-build      # vorhandenes _site/ nehmen
_scripts/test_e2e.sh --no-build --test-name-pattern="Foto"   # nur passende Tests
HEADLESS=0 _scripts/test_e2e.sh      # Chrome dabei zusehen
E2E_LOGS=1 _scripts/test_e2e.sh      # Browser-Konsole aller Tests ausgeben (sonst nur bei Fehlern)
CHROME=/pfad/zu/chrome _scripts/test_e2e.sh
```

Oder direkt: `node --test _tests/e2e/*.test.js` (nach `bundle exec jekyll build`). Braucht **Node ≥ 22** (eingebautes `WebSocket`) und **Google Chrome/Chromium** – beides in `DEPENDENCIES.md`. Läuft auch in GitHub Actions (`.github/workflows/e2e.yml`).

## Aufbau

| Datei | Was |
|---|---|
| `lib/fake-github.js` | Fake-GitHub: Git im Speicher (Blobs, Trees, Commits mit Eltern, Branches) + Pull Requests, genau die REST-Endpunkte von `github-api.js`, CORS, mehrere Tokens; Steuer-API `/__fake/…` |
| `lib/text-diff.js` | Zeilen-Diff (für `additions`/`deletions`/`patch` und eigene Prüfungen) und Drei-Wege-Merge wie git |
| `lib/static-server.js` | kleiner Server für `_site/` (statt `jekyll serve`), dazu `/__blank` |
| `lib/browser.js` | Chrome über das DevTools-Protokoll (CDP): Kontexte („Personen“), Seiten, `evaluate`, `click`, `fill`, Dateiauswahl, Screenshots |
| `lib/helpers.js` | `startEnv()`, `env.person(token)` und die Formular-Schritte (`openNew`, `openEdit`, `fill`, `addPhotos`, `toggleUse`, `submit`, `waitStatus` …) |
| `baseline.test.js` | Grundszenarien (neuer Beitrag, Bearbeiten, Fotos, offener PR, doppelt senden, ohne Token) |
| `fake-github.test.js` | Tests für das Fake selbst (Statuscodes, Merges, Konflikte, Fehler einschleusen) |
| `open-work.test.js` | Übersicht „Offen“ (`/mitmachen/offen/`): PRs nach Checks/Konflikt gruppiert, Issues übernehmbar/in Arbeit, „Übernehmen“, Cache, Fehler, ohne Token keine Anfrage |

Wie die Seite das Fake findet: `github-api.js` nimmt statt `https://api.github.com` die Adresse aus `localStorage["ifsmb-github-api"]` – **nur**, wenn die Seite auf `localhost`/`127.0.0.1` läuft und die Adresse selbst lokal ist. Auf ifsmb.de geht ein Token also nie woandershin. `env.person()` setzt das und das Token (`ifsmb-github-token`, Standard: `sessionStorage`) auf einer leeren Seite des Servers, bevor der Test eine echte Seite öffnet.

## Ein Szenario schreiben

```js
const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startEnv, editPage } = require("./lib/helpers.js");

let env;
before(async () => { env = await startEnv(); });          // Fake, Server und Chrome einmal pro Datei
after(() => env.close());
beforeEach(() => env.reset());                            // leeres Repo, Standard-Tokens
afterEach(async (t) => { if (!t.passed) env.logs().forEach((l) => console.log(l)); await env.closePeople(); });

test("zwei Leute ändern denselben Beitrag", async () => {
  const page = editPage("beitrag");                       // { url, path } einer echten Seite aus _site/
  env.seedSource([page.path]);                            // Datei aus dem Arbeitsverzeichnis auf main legen
  const alice = await env.person("token-alice");          // eigener Browser-Kontext = eigener Speicher
  const bob = await env.person("token-bob");
  await alice.openEdit(page.url);
  await alice.fill({ title: "Alice" }); await alice.submit(); await alice.waitStatus(/angelegt/);
  await bob.openEdit(page.url);                           // Bob sieht Alices offenen PR …
  await bob.page.waitForSelector("#neu-dialog .form-pr-notice");
  assert.match(await bob.notice(), /#1 .* von @alice/);
  await bob.page.click("#neu-dialog [data-pr-continue]"); // … und arbeitet dort weiter
  await bob.waitStatus("Stand aus #1 geladen.");
  await bob.fill({ title: "Bob" }); await bob.submit(); await bob.waitStatus(/#1.*ergänzt/);
  assert.equal(env.control.state().pulls.length, 1);
});
```

Hilfen an der Person (`alice.…`): `open(pfad)`, `openEdit(pfad?)`, `openNew(pfad?, typ?)`, `fill({ name: wert })` (Felder per `name`, auch das OverType-Textfeld `text`), `value(name)`, `preview()`, `addPhotos([pfade], [alt-texte])`, `acceptPhoto(alt | null)`, `toggleUse(nr, "gallery" | "social" | "image" | …)`, `submit()`, `status()`, `waitStatus(regex)`, `notice()` (Warnkasten zu offenen PRs). Für alles andere `alice.page`: `evaluate(fn, …args)`, `waitFor(fn, args)`, `waitForSelector`, `click`, `fill`, `text`, `screenshot(datei)`; `page.logs` sammelt Konsole und Fehler. Testfotos: `env.makePng("x.png", { width, height })`; Bildgröße eines Ergebnisses: `jpegSize(buffer)`.

Tokens nach `reset()`: `token-alice` (alice), `token-bob` (bob) – beide mit Schreibrechten –, `token-carol` (carol, **ohne** Schreibrechte). `env.person(null)` = nicht verbunden.

## Steuer-API des Fake-GitHub

Im Test direkt als `env.control.<methode>(args)`; von außen als `POST /__fake/<methode>` mit JSON-Body bzw. `GET /__fake/<methode>?arg=…` (eigenständig starten: `node _tests/e2e/lib/fake-github.js --port 0`).

| Methode | Argumente | Wirkung |
|---|---|---|
| `reset` | `{ users?, owner?, repo?, base? }` | alles leeren, ein leerer Start-Commit auf `main` |
| `setUser` | `{ token, login, name?, push?, expired?, issues?, checks? }` | Token anlegen/ändern; `issues: false` / `checks: false` = dem Token fehlt die Berechtigung (403), `issues: "read"` = Issues lesen, aber nicht zuweisen |
| `expireToken` | `{ token }` | Token läuft ab → `401 Bad credentials` |
| `seed` | `{ files: { pfad: text \| {base64} }, fromDir?: { root, paths }, message? }` | Commit auf `main` |
| `commit` | `{ branch, from?, files: { pfad: inhalt \| null }, login?, message? }` | jemand anderes committet (Branch wird aus `from`/main angelegt; `null` löscht) |
| `createBranch` / `moveBranch` / `deleteBranch` | `{ name, from? \| sha? }` | Branch anlegen / hart verschieben (Force-Push) / löschen (schließt offene PRs dazu, wie GitHub) |
| `openPull` | `{ head, base?, title, body?, login?, headRepo?, draft?, createdAt?, labels? }` | PR öffnen (`headRepo` ≠ Repo = aus einem Fork, `createdAt` ISO-Datum fürs Alter) |
| `setPull` | `{ number, draft?, title?, body?, labels?, mergeable?, mergeableState? }` | PR ändern; `mergeable: null` = „GitHub rechnet noch“, `mergeableState` z. B. `"behind"`/`"blocked"` – sonst berechnet `GET …/pulls/:n` beides (Konflikt → `dirty`, rote Checks → `unstable`, sonst `clean`) |
| `setChecks` | `{ number \| ref \| sha, checkRuns: [{ name, status?, conclusion? }], statuses: [{ context, state, description? }] }` | Checks eines Commits (bei `number` der Kopf des PRs) setzen; Standard `status: "completed"`, `conclusion: "success"` |
| `openIssue` | `{ title, body?, login?, labels?: [name \| { name, color }], assignees?: [login], createdAt? }` | Issue öffnen (Nummern gemeinsam mit den PRs, wie bei GitHub) |
| `closeIssue` | `{ number }` | Issue schließen |
| `mergePull` | `{ number, method?: "merge" \| "squash", deleteBranch? }` | mergen; zeilenweiser Drei-Wege-Merge, bei Konflikt Fehler 405 |
| `closePull` / `reopenPull` | `{ number }` | schließen / wieder öffnen |
| `mergeable` | `{ number }` | `{ mergeable, conflicts }` |
| `fail` | `{ method?, path? (RegExp), nth?, times?, status?, message?, delayMs?, run?: { op, args } }` | ab der n-ten passenden API-Anfrage (`times`-mal) verzögern, mit Status antworten und/oder vorher eine Steuer-Methode ausführen („in der Zwischenzeit committet Bob“) |
| `clearFailures` | – | Regeln löschen |
| `state` | – | `{ branches, pulls: [{ number, state, merged, login, head, base, commits, files: [{ filename, status, previous_filename, additions, deletions }] }], issues: [{ number, title, state, assignees: [login], labels: [name] }] }` |
| `readFile` | `{ ref?, path }` | `{ text, base64, sha, size }` oder `null` |
| `listFiles` | `{ ref?, prefix? }` | Pfade |
| `log` | `{ ref?, limit? }` | Commits, neueste zuerst: `{ sha, message, login, parents }` |
| `requests` / `clearRequests` | `{ since? }` | Protokoll aller API-Anfragen (`method`, `path`, `login`, `status`, `body`, `injected`) |

REST-Endpunkte wie bei GitHub: `GET /user`, `GET /repos/:o/:r` (`permissions.push` je Token), `GET …/pulls?state=`, `GET …/pulls/:n`, `GET …/pulls/:n/files`, `POST …/pulls`, `GET …/contents/:pfad?ref=`, `GET …/git/ref/heads/:branch`, `GET …/git/commits/:sha`, `GET …/git/blobs/:sha`, `POST …/git/blobs|trees|commits|refs`, `PATCH|DELETE …/git/refs/heads/:branch` (`force: false` → `422 Update is not a fast forward`), für die Übersicht „Offen“ außerdem `GET …/pulls/:n` mit `mergeable`/`mergeable_state`, `GET …/commits/:ref/check-runs`, `GET …/commits/:ref/status` (kombinierter Status), `GET …/issues?state=` (enthält wie bei GitHub auch PRs mit `pull_request`), `GET …/issues/:n`, `POST …/issues/:n/assignees` (Personen ohne Schreibrechte werden still übergangen). Fehler mit `{ message, documentation_url, status }` wie bei GitHub: 401 (ungültig/abgelaufen), 403 (keine Schreibrechte), 404, 405 (nicht mergebar), 422 (Validation Failed, Reference already exists …).

## Grenzen

- Das Fake ist kein vollständiges GitHub: Trees sind flach, keine Paginierungs-Header (`Link`), kein Rate-Limit, keine Reviews, Checks nur so, wie ein Test sie mit `setChecks` setzt, Branch-Schutz fehlt, PR-Dateien ohne Begrenzung auf 3000.
- Uhrzeit und Datum kommen vom Rechner – Dateinamen neuer Beiträge enthalten das heutige Datum; Tests lesen Pfade deshalb aus dem Fake statt sie fest zu erwarten.
- Die Bearbeiten-Tests nehmen den ersten Beitrag aus `_site/` (`editPage("beitrag")`) und legen dessen Quelldatei aus dem Arbeitsverzeichnis ins Fake.
