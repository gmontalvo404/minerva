# Minerva web (React)

The React version of the dashboard, being ported one module at a time. The
vanilla app at the project root is still the one you use day to day; this one
takes over when it reaches parity.

Same backend: `server.py` keeps owning the data and the API. Vite only serves
the UI and proxies `/api` and `/finance` to it.

## Run it

The desktop app does it for you: with the **React** checkbox on, opening
Minerva.app starts the Python server and the Vite dev server, and **Abrir**
opens both tabs. That checkbox is temporary and goes away with the old
dashboard.

By hand:

```bash
python3 server.py        # in one terminal
cd web && npm install    # once
npm run dev              # http://localhost:5173
```

Other scripts:

| Script | What it does |
|---|---|
| `npm run typecheck` | TypeScript in strict mode, no emit |
| `npm run build` | typecheck, then a production bundle in `dist/` |
| `npm run smoke` | renders the ported components with the demo data and prints what came out |

## Layout

```text
web/src/
  ui/            <- the design system. Everything visual lives here.
    tokens.css     colors, radii, spacing, control sizes
    base.css       reset and page defaults
    Button/, Select/, DataTable/, Card/, KpiCard/, ViewSwitch/,
    Tag/, Toggle/, Dialog/, Field/, EmptyState/
  lib/           <- api client, dataset paths, formatting, i18n, storage
  features/      <- one folder per section of the app
    nutrition/     the meal plan, ported as the reference
  App.tsx        <- shell: dataset, language, theme, section switch
```

## The rule that keeps the style from drifting

This is the whole point of the restructure:

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

`features/nutrition/ExcludedIngredients.tsx` is the example to copy: it is the
control that had drifted in the old app, and here it has no styling of its own
at all — just a `<Select>`, a `<Button>` and `<Tag>`s in a layout.

## What is ported

| Module | What works | What is not there yet |
|---|---|---|
| Cash flow | Year discovery and picker, annual KPIs, available-by-month bars, month by month table with totals by type, monthly view with incomes, expenses, category bars, and marking an expense as paid | Creating, editing and deleting entries, reordering, the change history, editing incomes, and the live USD/COP rate |
| Debts | KPIs, active/canceled switch, table with payment, installments, balance, rate and progress, drag to reorder, amortization schedule per debt | Editing a debt, the installment stepper, extra payments, and the cash-flow link editor |
| Credit simulator | Full form, computed installment, totals and schedule | Saving a simulation as a debt |
| Meal plan | Week, ingredients, shopping list, ground rules, excluded ingredients, read and save | Editing meals and ingredients. The feature itself is unfinished upstream |

Everything reads and writes through the same Python endpoints as the old
dashboard, on the dataset the Live/Demo switch selects.

## Checks

`npm run smoke` renders the modules against the bundled demo dataset and
verifies the numbers hold: the aggregation the React modules show has to match
what `server.py` computes for the same files. Both implementations agree.
