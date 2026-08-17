# Minerva

Minerva is a local-first personal finance suite — with a meal planner riding
along. A single Python server owns the data and **every money calculation**;
thin clients only paint what it answers: a React web app, an iOS app, and the
original dashboard it is replacing. No database, no accounts, no third-party
services — the data is JSON files in your own iCloud Drive, and nothing of it
ever enters this repository.

## Screenshots

The React app, on the demo dataset:

![Annual summary, light theme](docs/screenshots/minerva-react-annual-light.png)

![Annual summary, dark theme](docs/screenshots/minerva-react-annual-dark.png)

![Meal plan](docs/screenshots/minerva-react-nutrition.png)

The iOS app — the entry with its two doors, and the demo session:

<p>
  <img src="docs/screenshots/minerva-ios-entry.png" width="320" alt="iOS entry: log in with Face ID or open the demo" />
  <img src="docs/screenshots/minerva-ios-home-demo.png" width="320" alt="iOS home in demo mode" />
</p>

## The one rule

All business logic lives in `server/server.py`. The clients never do money math —
they render what the API answers, so two dashboards can never disagree on a
number. The iOS app takes this further: it does not even talk HTTP. On each
save the server precomputes the dashboard into `mobile/manifest.json` (a tiny
index: years, categories, one stamp per year) plus one `mobile/cash_flow/<year>.json`
per year — mirroring how the source data is organized — rewriting only the
files whose content actually changed. iCloud syncs them, and the phone reads
the manifest and decodes only the year on screen — anywhere, without the Mac
awake.

## What's inside

- **Cash flow**: annual and monthly views, incomes and expenses in COP/USD,
  paid/received tracking, budget summary, and a change history per movement.
- **Debts**: payment plan with drag-to-reorder, per-debt schedule detail, and
  links between debts and the cash flow entries that pay them.
- **Credit simulator**: full amortization preview; a simulation can be saved
  as a debt.
- **Meal plan**: meal catalog, weekly schedule with a randomizer, ingredient
  labels with a validated color palette, per-category exclusions, and a
  shopping list priced from the ingredient catalog.
- **Live / Demo** switch on every client, English/Spanish, light/dark themes.
- **Concurrency guard**: nutrition saves carry a content hash; a stale tab
  gets a 409 instead of silently overwriting the file.
- **Request guards**: every request must carry a local `Host` (kills DNS
  rebinding) and writes must carry a local `Origin` plus
  `Content-Type: application/json` (kills CSRF).

## The clients

- **`web/` — the React app** (React 19, Vite, TypeScript). The primary UI.
  Served by the Python server at `/cashflow`, `/debts`, `/credit` and
  `/nutrition` when `web/dist` exists; `web/src/ui/legacy.css` is the
  stylesheet it inherited from the original vanilla dashboard it replaced.
- **`ios/` — the iOS app** (SwiftUI). A viewer: entry with **Face ID only**
  (biometrics, no passcode fallback) for the real data, or the public demo
  without a session. Reads the iCloud snapshot and silently re-reads it every
  20 seconds. Built with xcodegen + Xcode — see `ios/README.md`.
- **`desktop/` — the macOS launcher**. Starts and stops the server without a
  terminal, behind a Touch ID gate. Opens the React app in your browser,
  reusing the Minerva tab you already have (Safari and Chromium browsers),
  and can run the Vite dev server while both web versions coexist.

## Structure

```text
.
+-- web                  <- the React app (Vite + TypeScript)
+-- ios                  <- the iOS app (SwiftUI, xcodegen)
+-- desktop              <- macOS launcher (Swift, build.sh)
+-- server               <- the only brain
|   +-- server.py        <- data, money math, endpoints
|   `-- bundled          <- ships with the repo:
|       +-- shared       <- category, type and currency catalogs
|       `-- demo         <- the Demo dataset (cash_flow, debts, nutrition)
+-- docs                 <- screenshots
`-- finance
    `-- data             <- your own data: a symlink into iCloud Drive,
                            ignored by git (see Data)
```

## Run

The server:

```bash
python3 server/server.py
```

It serves everything on `http://localhost:8123` (`MINERVA_PORT` changes the
port) and opens Firefox, falling back to Chrome and then the system default —
`MINERVA_BROWSER=chrome`, `=default` or `=none` override that.

The macOS launcher, if you would rather not use a terminal:

```bash
./desktop/build.sh    # -> ~/Applications/Minerva.app
```

The React app is pre-built into `web/dist` and served by the same Python
process. To develop it:

```bash
cd web
npm install
npm run dev      # Vite on :5173, /api and /finance proxied to the server
npm run build    # refresh web/dist, what the server serves
npm run smoke    # the checks below
```

The iOS app needs Xcode and ten minutes: `ios/README.md` walks through it.

## Data

Your data lives in `finance/data` — which since 2026-08 is a **symlink into
iCloud Drive** (`iCloud Drive/Minerva/data`): backed up, versioned, synced to
the phone, and still completely outside git. `MINERVA_DATA_ROOT` points the
server anywhere else if you prefer plain local files; the desktop app has a
folder picker for the same thing.

Two datasets, chosen with the **Live / Demo** switch (or the two doors of the
iOS entry): **Live** is `finance/data`; **Demo** is `server/bundled/demo`, ships
with the repo, and is an editable sandbox.

The server also maintains `finance/data/mobile/` — `manifest.json` plus one
precomputed `cash_flow/<year>.json` per year, for the iOS app — refreshed on
every save and at boot, touching only the files whose content changed. The
demo doesn't travel through iCloud: it ships bundled inside the app.

Inside either dataset the app discovers the year folders in `cash_flow` on its
own (`2026`, `2027`, …).

### Incomes

```text
finance/data/cash_flow/<year>/incomes/incomes.json
```

```json
{
  "months": [
    {
      "name": "January",
      "month_id": "01-january",
      "income_usd": 500,
      "usd_cop": 4000,
      "income_cop": 2000000,
      "entries": [
        {
          "received": true,
          "description": "Main income",
          "amount_usd": 500,
          "usd_cop": 4000,
          "amount_cop": 2000000,
          "created_at": "2026-04-15T15:21:01.000Z",
          "updated_at": "2026-04-15T15:21:01.000Z",
          "history": []
        }
      ]
    }
  ]
}
```

When incomes are edited from a client, the server recalculates the month's
`income_usd`, `income_cop` and `usd_cop` from the entries marked as received.

### Expenses

One unified file per month:

```text
finance/data/cash_flow/<year>/outcomes/01-january.json
```

```json
{
  "entries": [
    {
      "paid": true,
      "description": "Rent",
      "category": "Housing",
      "amount_cop": 680000,
      "type": "needs",
      "created_at": "2026-04-15T15:21:01.000Z",
      "updated_at": "2026-04-15T15:21:01.000Z",
      "history": []
    }
  ]
}
```

Valid types: `needs`, `wants`, `savings`, `debts`. The server still reads the
legacy format split by type (`01-january/needs.json`, …), and still accepts
the old `active` flag, but current data should use `paid` for expenses and
`received` for incomes.

### Debts

```text
finance/data/debts/debts.json
```

### Meal plan

```text
finance/data/nutrition/plan.json
```

Ingredients can carry several labels (`"category": ["Granos", "Carbohidratos"]`).

### A new year

Create `finance/data/cash_flow/<year>/` with its `incomes/` and `outcomes/`,
and refresh — the year appears in the selector.

## Endpoints

Reads:

- `GET /api/dashboard`: a year of cash flow, aggregated — months, totals,
  categories. What every dashboard paints.
- `GET /api/debts/detail`, `/api/debts/links`, `/api/debts/simulate`
- `GET /api/nutrition/shopping`: the week's list, priced.
- `GET /api/fx/usd-cop`: USD/COP rate via Coinbase.
- `GET /api/mobile/export`: force a snapshot refresh (also automatic).
- `GET /api/dev/live-reload`: dev auto-reload stream.

Writes (all POST, all guarded by Origin + Content-Type):

- `/api/entries/create | update | delete | reorder | active`
- `/api/incomes/create | update | delete | reorder`
- `/api/debts/create | update | reorder`
- `/api/nutrition/save` — carries a `base_hash`; a mismatch answers 409 and
  the client reloads instead of overwriting.

The server only writes `.json` files inside the data roots.

## Security and privacy

- The server binds `localhost` only. `MINERVA_HOST=0.0.0.0` opens it to your
  local network — it prints the address to type into a phone — but there is
  **no authentication**: use it only on a network you trust, and prefer the
  iOS snapshot flow, which needs no open port at all.
- Every request is checked against a local-host allowlist, and writes against
  a local-origin allowlist plus a JSON content type.
- `finance/data` (the symlink and everything behind it) and `.ai/` are
  gitignored; what ships is the demo dataset. Before publishing changes,
  check you are not committing real financial information.
- On iOS the real data sits behind Face ID with no passcode fallback, the
  session closes when the app backgrounds, and the task switcher never shows
  real figures.

## Development

```bash
python3 -m py_compile server.py    # server syntax
cd web && npm run smoke            # the React app's checks
```

The smoke script verifies, among other things: that no client module contains
money arithmetic, that `legacy.css` is still a verbatim copy of `styles.css`,
that every CSS class the React app emits exists in the original stylesheet,
that both apps persist the same preference keys, and that client and server
agree on the routes. For the iOS app:

```bash
cd ios && xcodegen generate        # regenerate the Xcode project
```
