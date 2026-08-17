# Minerva server

The only brain. One Python file, standard library only: it owns the JSON data,
does **every money calculation**, serves the HTTP API and the built web app,
and precomputes the snapshot the iOS app reads from iCloud. Clients paint what
it answers — none of them does money math of its own.

## Run

```bash
python3 server/server.py
```

Serves everything on `http://localhost:8123` and opens Firefox, falling back
to Chrome and then the system default. Needs Python 3.10+.

| Env var | What it does |
|---|---|
| `MINERVA_PORT` | Port (default 8123) |
| `MINERVA_HOST` | `0.0.0.0` opens it to the local network — **no authentication**, see Security |
| `MINERVA_DATA_ROOT` | Points the live dataset somewhere other than `finance/data` |
| `MINERVA_BROWSER` | `chrome`, `default` or `none` |

The macOS launcher (`desktop/`) runs it as a child process with these set.

## Datasets

Two of them, chosen with the **Live / Demo** switch on every client:

- **Live** is `finance/data` — a symlink into iCloud Drive, ignored by git.
- **Demo** is `server/bundled/demo` — ships with the repo, editable sandbox.

Shared catalogs (categories, types, currencies) live in `server/bundled/shared`
and belong to no dataset. Inside either dataset the server discovers the year
folders in `cash_flow/` on its own (`2026`, `2027`, …); to start a new year,
create `cash_flow/<year>/` with its `incomes/` and `outcomes/` and refresh.

## Data formats

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
`received` for incomes. The server assigns each entry a permanent numeric
`id` on first write, so clients can name a movement even after reordering.

### Debts and meal plan

```text
finance/data/debts/debts.json
finance/data/nutrition/plan.json
```

Ingredients can carry several labels (`"category": ["Granos", "Carbohidratos"]`).

## The phone's snapshot

The iOS app never talks HTTP. On every save (and at boot) the server rewrites
`finance/data/mobile/`:

- `manifest.json` — a tiny index: years, the shared category catalog, and one
  stamp per year.
- `cash_flow/<year>.json` — a whole year precomputed, the same payload
  `/api/dashboard` answers.

Each file embeds its `generated_at` and a `content_hash`, and is rewritten
only when its content actually changed — so an edit to one month travels
through iCloud as a single year file, and the phone decodes only the year on
screen after checking the stamp the manifest promised.

Edits flow the other way through a mailbox: the phone drops one JSON command
per change into `mobile/outbox/`, iCloud carries it over, and a watcher here
applies it **through the server's own API** — same validation, same history,
same snapshot refresh — then deletes it. Commands are idempotent and find
their entry by permanent id, with index + description as fallback.

The demo does not travel through iCloud: it ships bundled inside the iOS app
as `ios/Minerva/DemoSnapshot.json`. After changing the demo data, refresh it:

```bash
curl -s http://localhost:8123/api/mobile/demo > ios/Minerva/DemoSnapshot.json
```

## Endpoints

Reads:

- `GET /api/dashboard`: a year of cash flow, aggregated — months, totals,
  categories. What every dashboard paints.
- `GET /api/debts/detail`, `/api/debts/links`, `/api/debts/simulate`
- `GET /api/nutrition/shopping`: the week's list, priced.
- `GET /api/fx/usd-cop`: USD/COP rate via Coinbase.
- `GET /api/mobile/export`: force a snapshot refresh (also automatic).
- `GET /api/mobile/demo`: the bundled-demo snapshot for the iOS app.
- `GET /api/dev/live-reload`: dev auto-reload stream.

Writes (all POST, all guarded by Origin + Content-Type):

- `/api/entries/create | update | delete | reorder | active`
- `/api/incomes/create | update | delete | reorder`
- `/api/debts/create | update | reorder`
- `/api/nutrition/save` — carries a `base_hash`; a mismatch answers 409 and
  the client reloads instead of overwriting.

The server only writes `.json` files inside the data roots.

## Security and privacy

- Binds `localhost` only. `MINERVA_HOST=0.0.0.0` opens it to your local
  network — it prints the address to type into a phone — but there is **no
  authentication**: use it only on a network you trust, and prefer the iOS
  snapshot flow, which needs no open port at all.
- Every request is checked against a local-host allowlist (kills DNS
  rebinding), and writes against a local-origin allowlist plus
  `Content-Type: application/json` (kills CSRF).
- Nutrition saves carry a content hash; a stale tab gets a 409 instead of
  silently overwriting the file.
- `finance/data` (the symlink and everything behind it) and `.ai/` are
  gitignored; what ships is the demo dataset. Before publishing changes,
  check you are not committing real financial information.

## Development

```bash
python3 -m py_compile server/server.py   # syntax check
cd web && npm run smoke                  # cross-checks the React app against this server
```

Editing `server.py` while it runs restarts it in place (it watches itself).
