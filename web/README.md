# Minerva web (React)

The React app — the primary UI. React 19, Vite, TypeScript. It replaced the
original vanilla dashboard; `src/ui/legacy.css` is the stylesheet it inherited
from it, kept as the reference the design system is measured against.

Same backend as every client: `server/server.py` owns the data and the API.
The production bundle in `web/dist` is served by the Python server itself at
`/finances/cashflow`, `/finances/debts`, `/finances/credit` and `/nutrition`
— plus the flat `/cashflow`, `/debts` and `/credit` of the version before
Finances existed, which the app rewrites to their nested home. The Vite dev
server only proxies `/api` and `/finance` to it.

## Run it

The desktop launcher does it for you — opening Minerva.app starts the server
and opens the app in your browser. By hand:

```bash
python3 server/server.py     # in one terminal
cd web && npm install        # once
npm run dev                  # http://localhost:5173, live sources
```

| Script | What it does |
|---|---|
| `npm run typecheck` | TypeScript in strict mode, no emit |
| `npm run build` | typecheck, then a production bundle in `dist/` — what the server serves |
| `npm run smoke` | the cross-checks below |

## Layout

```text
web/src/
  ui/            <- the design system. Everything visual lives here.
    tokens.css     colors, radii, spacing, control sizes
    base.css       reset and page defaults
    legacy.css     the inherited stylesheet, the visual reference
    Button/, Select/, DataTable/, Card/, KpiCard/, ViewSwitch/,
    Tag/, Toggle/, Dialog/, Field/, EmptyState/
  lib/           <- api client, dataset paths, formatting, i18n, storage
  features/      <- one folder per module of the app
    cashflow/      annual + monthly views, entry/income editing, history
    debts/         payment plan, schedules, cash-flow links
    credit/        amortization simulator
    nutrition/     the meal plan
  App.tsx        <- shell: dataset, language, theme, and the two levels of
                    navigation — Finances / Meal plan in the header, and the
                    module inside Finances in the sidebar
```

## The rule that keeps the style from drifting

- **Anything visual comes from `src/ui`.** A new table uses `<DataTable>`, a new
  dropdown uses `<Select>`, a new set of tabs uses `<ViewSwitch>`. You cannot
  end up with an option box that looks unlike the others, because there is only
  one option box.
- **A feature's `.module.css` may only do layout** — grid, gap, flex,
  alignment — using the spacing tokens. The moment you write a color, a radius,
  a shadow or a font size in `features/`, the thing you are building belongs in
  `ui/` instead.
- **No raw values in `ui/` either.** Components read `var(--accent)`,
  `var(--radius-sm)`, `var(--space-4)`. Adding a token is fine; hardcoding
  `#4f7ec9` is not.

`features/nutrition/ExcludedIngredients.tsx` is the example to copy: it has no
styling of its own at all — just a `<Select>`, a `<Button>` and `<Tag>`s in a
layout.

## Checks

`npm run smoke` renders every module against the bundled demo dataset and
verifies the numbers hold: the aggregation the React modules show has to match
what `server/server.py` computes for the same files. It also checks that no
client module contains money arithmetic, that every CSS class the app emits
exists in `legacy.css`, and that client and server agree on the routes.
