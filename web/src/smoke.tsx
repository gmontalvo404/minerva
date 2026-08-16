/** Renders every ported module with real data and checks the numbers. */
import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { WeekExclusions } from "./features/nutrition/WeekExclusions";
import type { NutritionPlan } from "./features/nutrition/types";
import type { ShoppingLine } from "./lib/api";
import { debtTotals } from "./features/debts/calc";
import type { Debt } from "./features/debts/calc";
import { CardPanel, DataTable, Donut, FreeBars, KpiCard, KpiGrid, Panel, Progress, Select, Tag, ViewSwitch } from "./ui";
import type { Column } from "./ui";

const read = <T,>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
let failures = 0;

function check(label: string, condition: boolean, detail: string) {
  console.log(`  ${condition ? "ok  " : "FALLA"} ${label}: ${detail}`);
  if (!condition) failures += 1;
}

console.log("== el cliente ya no calcula dinero ==");
const clientModules = [
  "./src/features/nutrition/NutritionPage.tsx",
  "./src/features/nutrition/MealCatalog.tsx",
  "./src/features/cashflow/load.ts",
  "./src/features/debts/calc.ts",
  "./src/features/cashflow/DebtPicker.tsx",
  "./src/features/cashflow/DebtLinkDialog.tsx",
];
for (const file of clientModules) {
  const source = readFileSync(file, "utf8");
  // Summing values the server already priced is fine (the KPI row does it).
  // What must never come back are the formulas themselves.
  const arithmetic =
    /\bqty\s*\*|\*\* \(1 \/ 12\)|price_per_unit\s*\*|\bcompound\b|installmentOf/.test(source) ||
    /extraPayment\s*[-+*/]|abonoStrategy|principalWithExtra/.test(source);
  check(`${file.split("/").pop()} sin aritmetica de dinero`, !arithmetic, arithmetic ? "quedan cuentas" : "solo tipos y adaptacion");
}

const plan = JSON.parse(readFileSync("../finance/app/demo/nutrition/plan.json", "utf8")) as NutritionPlan;
check("el plan demo sigue legible", plan.ingredients.length > 0, `${plan.ingredients.length} ingredientes`);

console.log("\n== deudas: el calculo vive en el backend ==");
const debtsModule = readFileSync("./src/features/debts/calc.ts", "utf8");
check(
  "el cliente ya no amortiza",
  !/\*\* \(1 \/ 12\)|installmentOf|dailyInterest|buildSchedule/.test(debtsModule),
  "calc.ts no contiene matematica de dinero",
);
const emptyTotals = debtTotals([] as Debt[]);
check("totales sobre lista vacia", emptyTotals.count === 0, `${emptyTotals.count} deudas`);

console.log("\n== cash flow (dataset demo) ==");
interface OutcomeFile {
  entries?: Array<{ description?: string; category?: string; amount_cop?: number; type?: string }>;
}
// El demo empacado en el repo: cifras publicas y estables a proposito, para
// que este check nunca dependa de datos personales.
const january = read<OutcomeFile>("../finance/app/demo/cash_flow/demo/outcomes/01-january.json");
const planned = (january.entries ?? []).filter(
  (entry) =>
    String(entry.description ?? "").toLowerCase() !== "free" &&
    String(entry.category ?? "").toLowerCase() !== "free",
);
const outcomes = planned.reduce((sum, entry) => sum + (Number(entry.amount_cop) || 0), 0);
const savings = planned
  .filter((entry) => entry.type === "savings")
  .reduce((sum, entry) => sum + (Number(entry.amount_cop) || 0), 0);
check("gastos de enero demo", Math.abs(outcomes - 1_760_000) < 1, `${outcomes.toFixed(0)} COP`);
check("ahorros de enero demo", savings === 80_000, `${savings} COP`);

console.log("\n== render de componentes ==");
const markup = [
  renderToStaticMarkup(
    <WeekExclusions
      ingredients={plan.ingredients}
      excluded={["arroz"]}
      onChange={() => {}}
      t={(key: string) => key}
    />,
  ),
  renderToStaticMarkup(
    <DataTable
      columns={
        [
          { key: "name", header: "Ingrediente", render: (row) => row.name },
          { key: "total", header: "Total", render: (row) => String(row.total) },
        ] satisfies Column<ShoppingLine>[]
      }
      rows={[] as ShoppingLine[]}
      rowKey={(row) => row.id}
      empty={<span>vacio</span>}
    />,
  ),
  renderToStaticMarkup(<KpiCard label="Saldo" value="$ 1" meta="demo" />),
  renderToStaticMarkup(<Progress value={42} />),
  renderToStaticMarkup(<Tag onRemove={() => {}}>Arroz</Tag>),
  renderToStaticMarkup(
    <Select label="x" options={[{ value: "a", label: "A" }]} value="a" onChange={() => {}} />,
  ),
  renderToStaticMarkup(
    <ViewSwitch
      label="x"
      options={[
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ]}
      value="a"
      onChange={() => {}}
    />,
  ),
];
check("componentes renderizados", markup.every((html) => html.length > 0), `${markup.length}/7`);

console.log("\n== marcado: mismas clases que index.html ==");
const annual = renderToStaticMarkup(
  <Panel eyebrow="RESUMEN ANUAL" title="Vista global demo" note="…">
    <KpiGrid>
      <KpiCard label="Ingresos" value="COP 24.057.000" meta="acumulado" />
    </KpiGrid>
    <div className="chart-grid chart-grid--annual">
      <CardPanel eyebrow="DINERO LIBRE" title="Disponible por mes">
        <FreeBars items={[{ key: "01", label: "Ene", value: 240000, display: "$240k" }]} />
      </CardPanel>
      <CardPanel eyebrow="DISTRIBUCIÓN" title="Gastos por tipo">
        <Donut
          segments={[{ key: "needs", label: "Needs", value: 10, color: "#e0245e", display: "COP 10" }]}
          emptyTitle="—"
          emptyMessage="—"
          formatPercent={(ratio) => `${ratio.toFixed(1)}%`}
        />
      </CardPanel>
    </div>
    <CardPanel eyebrow="COMPARATIVA" title="Resumen por mes">
      <DataTable
        columns={[{ key: "a", header: "Mes", render: () => "Ene" }]}
        rows={[{}]}
        rowKey={() => "1"}
      />
    </CardPanel>
  </Panel>,
);

const expected = [
  "panel",
  "section-head",
  "section-head__eyebrow",
  "section-head__note",
  "kpi-grid",
  "kpi-card",
  "kpi-card__label",
  "kpi-card__value",
  "kpi-card__meta",
  "chart-grid--annual",
  "card__head",
  "card__eyebrow",
  "free-bars",
  "free-bars__column",
  "free-bars__frame",
  "free-bars__axis",
  "free-bars__bar",
  "free-bars__label",
  "free-bars__value",
  "donut-layout",
  "donut__hole",
  "legend-item__swatch",
  "legend-item__name",
  "legend-list",
  "data-table",
  "table-scroll",
];

const monthlyClasses = [
  "control-sidebar__credit-view",
  "control-sidebar__debt-view",
  "control-sidebar__nutrition-view",
  "control-sidebar__months",
  "control-sidebar__annual-button",
  "credit-simulator-layout",
  "credit-simulator-input-card",
  "credit-simulator-form",
  "credit-simulator-summary-card",
  "credit-simulator-table-wrap",
  "debt-detail-toolbar__label",
  "entry-input--no-spin",
  "debt-detail-layout",
  "debt-detail-summary-panel",
  "debt-detail-schedule-panel",
  "debt-detail-schedule-panel__head",
  "debt-detail-schedule-panel__title",
  "debt-detail-table-wrap",
  "debt-detail-toolbar",
  "debt-detail-toolbar__action",
  "debt-detail-dialog__actions",
  "debt-detail-dialog__currency",
  "debt-detail-currency-switch",
  "debt-sort-button",
  "debt-table-heading",
  "debt-paid-status",
  "debt-paid-status--paid",
  "debt-paid-status--unpaid",
  "credit-summary-grid",
  "credit-summary-group",
  "credit-summary-cards",
  "credit-summary-card",
  "credit-summary-card--editable",
  "credit-summary-card__label",
  "credit-summary-card__value",
  "credit-summary-card__meta",
  "debt-input--detail-money",
  "debt-input--detail-rate",
  "debt-input--detail-term",
  "debt-link-current",
  "debt-link-current__head",
  "debt-link-current__description",
  "debt-link-current__clear",
  "debt-link-current__list",
  "debt-link-current__item",
  "debt-link-current__item--loading",
  "debt-link-current__empty",
  "debt-link-current__month",
  "debt-link-current__period",
  "debt-link-current__amount",
  "create-entry-debt-section",
  "create-entry-debt-list",
  "create-entry-debt-list__empty",
  "create-entry-debt-option",
  "create-entry-debt-option__name",
  "create-entry-debt-option__meta",
  "movement-form__full",
  "field__hint",
  "entry-actions-menu",
  "entry-actions-menu__item",
  "entry-actions-menu__item--danger",
  "history-dialog",
  "history-dialog__panel",
  "history-dialog__head",
  "history-dialog__close",
  "history-dialog__body",
  "history-summary",
  "history-summary__item",
  "history-list",
  "history-item",
  "history-item__head",
  "history-item__table",
  "history-item__row",
  "history-item__row--head",
  "create-entry-dialog",
  "movement-dialog__panel",
  "movement-form__grid",
  "movement-form__actions",
  "movement-form__active",
  "movement-form__active-control",
  "movement-form__cancel",
  "entry-history-button",
  "button--entry-add",
  "entry-type-shell",
  "entry-select-shell",
  // entry-select--type y --category viven en el <select> nativo que
  // pretty-select oculta; el port no tiene select nativo, asi que no se emiten.
  "entry-description-shell",
  "entry-input--amount",
  "entry-auto-badge",
  "entry-row--auto",
  "entry-row-number",
  "entry-delete-button",
  "entry-drag-handle__grip",
  "entry-usd-value",
];

const annualTableClasses = [
  "annual-col-metric",
  "annual-col-month",
  "annual-col-total",
  "annual-head-month",
  "annual-cell--concept",
  "annual-concept-chip",
  "annual-cell--numeric",
  "annual-value--positive",
  "annual-type-pill",
  "entry-cell--number",
  "entry-row-number",
  "entry-active-toggle",
  "sort-controls",
  "sort-controls__label",
  "pretty-select__button",
  "pretty-select__value",
  "pretty-select-menu--type",
  "pretty-select-menu--category",
  "pretty-select-menu--year",
  "pretty-select-menu__option",
  "view-switch--sort",
];
const missing = expected.filter((cls) => !annual.includes(cls));
check("clases del marcado original", missing.length === 0, missing.length ? `faltan: ${missing.join(", ")}` : `${expected.length} presentes`);

// Every class we emit has to be one the original app uses too: in its
// stylesheet, its markup or its render functions. Some, like annual-cell--numeric,
// carry no style even in the original — what matters is that we invent none.
const original =
  readFileSync("./src/ui/legacy.css", "utf8") +
  readFileSync("../legacy/app.js", "utf8") +
  readFileSync("../legacy/index.html", "utf8");
const invented = [...expected, ...annualTableClasses, ...monthlyClasses].filter((cls) => !original.includes(cls));
check(
  "ninguna clase inventada",
  invented.length === 0,
  invented.length ? `inventadas: ${invented.join(", ")}` : `${expected.length + annualTableClasses.length + monthlyClasses.length} verificadas`,
);

// The check above only sees what the tables render. This one reads every
// component, so a class typed straight into the JSX of a view nobody rendered
// here still has to exist in the original.
function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith("smoke.tsx") ? [full] : [];
  });
}

const literals = new Set<string>();
for (const file of tsxFiles("./src")) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/className=\{?"([^"]*)"/g)) {
    for (const cls of (match[1] ?? "").split(/\s+/).filter(Boolean)) literals.add(cls);
  }
}
const strays = [...literals].filter((cls) => !original.includes(cls));
check(
  "ninguna clase inventada en los componentes",
  strays.length === 0,
  strays.length ? `inventadas: ${strays.join(", ")}` : `${literals.size} clases distintas`,
);

console.log("\n== textos ==");
const sources = [
  "./src/App.tsx",
  "./src/features/cashflow/CashFlowPage.tsx",
  "./src/features/cashflow/AnnualTable.tsx",
  "./src/features/debts/DebtsPage.tsx",
  "./src/features/credit/CreditPage.tsx",
  "./src/features/nutrition/NutritionPage.tsx",
  "./src/features/nutrition/MealCatalog.tsx",
  "./src/features/nutrition/WeekExclusions.tsx",
  "./src/features/nutrition/LabelEditor.tsx",
  "./src/features/debts/CreateDebtDialog.tsx",
  "./src/features/debts/DebtActionsMenu.tsx",
  "./src/features/cashflow/DeleteConfirmDialog.tsx",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const dictionary = readFileSync("./src/lib/i18n.ts", "utf8");
const usedKeys = [...sources.matchAll(/\bt\("([a-z0-9_]+)"/g)].map((match) => match[1] as string);
const unknownKeys = [...new Set(usedKeys)].filter((key) => !dictionary.includes(`  ${key}: "`));
if (unknownKeys.length) console.log("    (claves sin traducción)", unknownKeys.join(", "));
check(
  "todas las claves existen en el diccionario",
  unknownKeys.length === 0,
  unknownKeys.length ? `sin traducción: ${unknownKeys.join(", ")}` : `${new Set(usedKeys).size} claves`,
);

// The nutrition tabs and columns build their key from the tab name, so the
// regex above never sees them. They are checked as families instead.
const families = [
  ...["rules", "plan", "ingredients", "breakfast", "lunch", "dinner", "snack"].map(
    (tab) => `nutrition_tab_${tab}`,
  ),
  ...["day", "breakfast", "lunch", "snack", "dinner"].map((slot) => `nutrition_col_${slot}`),
];
const missingFamily = families.filter((key) => !dictionary.includes(`  ${key}: "`));
check(
  "las claves armadas por plantilla existen",
  missingFamily.length === 0,
  missingFamily.length ? `faltan: ${missingFamily.join(", ")}` : `${families.length} claves`,
);

// A key whose text has a {token} must be called with params, or the raw token
// reaches the screen — that is what showed "{count} entries".
const tokenKeys = [...dictionary.matchAll(/^  ([a-z0-9_]+): "([^"]*\{[a-z]+\}[^"]*)"/gm)].map((m) => m[1] as string);
const calledWithoutParams = tokenKeys.filter((key) =>
  new RegExp(`t\\("${key}"\\)`).test(sources),
);
check(
  "ningún texto con {token} se usa sin parámetros",
  calledWithoutParams.length === 0,
  calledWithoutParams.length ? `sin interpolar: ${calledWithoutParams.join(", ")}` : `${tokenKeys.length} revisadas`,
);

// styles.css decides alignment through classes; an inline textAlign would
// silently diverge from the original, like the Monthly summary table did.
const uiSources = [
  "./src/ui/DataTable/DataTable.tsx",
  "./src/features/cashflow/CashFlowPage.tsx",
  "./src/features/cashflow/AnnualTable.tsx",
  "./src/features/debts/DebtsPage.tsx",
  "./src/features/nutrition/NutritionPage.tsx",
  "./src/features/credit/CreditPage.tsx",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
check(
  "sin alineación en línea",
  !/textAlign/.test(uiSources),
  /textAlign/.test(uiSources) ? "hay textAlign en el código" : "la alineación la da el CSS",
);

const monthlySources = [
  "./src/features/cashflow/EntriesTable.tsx",
  "./src/features/cashflow/IncomesTable.tsx",
  "./src/features/cashflow/EntryActionsMenu.tsx",
  "./src/features/cashflow/HistoryDialog.tsx",
  "./src/features/cashflow/AddDialogs.tsx",
  "./src/features/cashflow/DebtPicker.tsx",
  "./src/features/cashflow/DebtLinkDialog.tsx",
  "./src/features/debts/DebtDetailDialog.tsx",
  "./src/features/debts/DebtLinkDialog.tsx",
  "./src/features/credit/CreditPage.tsx",
  "./src/features/debts/DebtsPage.tsx",
  "./src/features/nutrition/NutritionPage.tsx",
  "./src/ui/Dialog/Dialog.tsx",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const notEmitted = monthlyClasses.filter((cls) => !monthlySources.includes(cls));
check(
  "el mensual emite las clases del original",
  notEmitted.length === 0,
  notEmitted.length ? `no se emiten: ${notEmitted.join(", ")}` : `${monthlyClasses.length} emitidas`,
);

/**
 * Rules of hooks, the part that blanks the whole page: a hook below an early
 * return changes the hook count between renders and React tears the tree down.
 * There is no browser here to catch it, and the compiler does not see it.
 */
const componentFiles = [
  "./src/App.tsx",
  "./src/features/cashflow/CashFlowPage.tsx",
  "./src/features/cashflow/EntriesTable.tsx",
  "./src/features/cashflow/IncomesTable.tsx",
  "./src/features/cashflow/AnnualTable.tsx",
  "./src/features/cashflow/AddDialogs.tsx",
  "./src/features/cashflow/HistoryDialog.tsx",
  "./src/features/cashflow/EntryActionsMenu.tsx",
  "./src/features/cashflow/DebtLinkDialog.tsx",
  "./src/features/debts/DebtDetailDialog.tsx",
  "./src/features/debts/DebtLinkDialog.tsx",
  "./src/features/debts/DebtsPage.tsx",
  "./src/features/nutrition/NutritionPage.tsx",
  "./src/features/credit/CreditPage.tsx",
  "./src/ui/Select/Select.tsx",
  "./src/ui/Dialog/Dialog.tsx",
];

const conditionalHooks: string[] = [];
for (const file of componentFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  let afterEarlyReturn = false;

  lines.forEach((line, index) => {
    // A new top-level function starts a new component: clear the flag.
    if (/^(export )?(async )?(function|const) /.test(line)) afterEarlyReturn = false;

    // An early return is an `if` at the body's own indent whose block returns.
    if (/^ {2}if \(/.test(line)) {
      const close = lines.findIndex((candidate, at) => at > index && /^ {2}\}/.test(candidate));
      const block = lines.slice(index, close === -1 ? index + 1 : close);
      if (block.some((candidate) => /^ {4}return\b/.test(candidate)) || /\breturn\b/.test(line)) {
        afterEarlyReturn = true;
      }
    }

    if (afterEarlyReturn && /^ {2}(const |let )?[\w{}[\], ]*=? ?use[A-Z]\w*\(/.test(line)) {
      conditionalHooks.push(`${file.split("/").pop()}:${index + 1} ${line.trim().slice(0, 48)}`);
    }
  });
}

check(
  "ningún hook debajo de un return",
  conditionalHooks.length === 0,
  conditionalHooks.length ? conditionalHooks.join(" | ") : `${componentFiles.length} componentes`,
);

/**
 * The other invisible one: React clears currentTarget when the event finishes
 * propagating, so reading it inside a state updater — which React may run later,
 * at render time — yields null and the menu opens anchored to nothing.
 */
const lateCurrentTarget: string[] = [];
for (const file of componentFiles) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (!line.includes("currentTarget")) return;
    const before = lines.slice(Math.max(0, index - 6), index).join("\n");
    const opensUpdater = /set[A-Z]\w*\(\s*\(\w*\)?\s*=>/.test(before);
    if (opensUpdater && !/\)\s*;/.test(before.split(/set[A-Z]\w*\(/).pop() ?? "")) {
      lateCurrentTarget.push(`${file.split("/").pop()}:${index + 1}`);
    }
  });
}
check(
  "ningún currentTarget dentro de un updater",
  lateCurrentTarget.length === 0,
  lateCurrentTarget.length ? lateCurrentTarget.join(", ") : "se lee en el handler",
);

/**
 * Preferences the original remembers must survive here too, under the very same
 * key: losing one means the reader comes back to a tab they did not choose.
 */
const NOT_PORTED_YET = ['"cashflow-dashboard-live-usd-cop-rate"'];
const originalKeys = [...new Set(readFileSync("../legacy/app.js", "utf8").match(/"cashflow-dashboard-[a-z-]+"/g) ?? [])];
const portKeys = readFileSync("./src/lib/storage.ts", "utf8");
const dropped = originalKeys.filter((key) => !portKeys.includes(key) && !NOT_PORTED_YET.includes(key));
check(
  "se guardan las mismas preferencias que el original",
  dropped.length === 0,
  dropped.length ? `no se guardan: ${dropped.join(", ")}` : `${originalKeys.length - NOT_PORTED_YET.length} claves`,
);

/**
 * legacy.css is a verbatim copy of the original stylesheet. If the two drift,
 * the React app quietly stops looking like the app it is replacing.
 */
const sourceSheet = readFileSync("../legacy/styles.css", "utf8");
const copiedSheet = readFileSync("./src/ui/legacy.css", "utf8");
check(
  "legacy.css sigue siendo copia fiel de styles.css",
  sourceSheet === copiedSheet,
  sourceSheet === copiedSheet ? `${sourceSheet.length} bytes iguales` : "las dos hojas divergieron",
);

/**
 * The address bar and the server have to agree on the section paths: if they
 * drift, reloading on a section serves a 404 instead of the app.
 */
const appSource = readFileSync("./src/App.tsx", "utf8");
const routes = [...appSource.matchAll(/^ {2}(\w+): "\/([a-z]+)",$/gm)].map((match) => match[2]);
const serverBlock = readFileSync("../server.py", "utf8").match(/REACT_SECTION_PATHS = frozenset\(\{([^}]*)\}\)/);
const serverRoutes = [...(serverBlock?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
const sameRoutes =
  routes.length > 0 && [...routes].sort().join(",") === [...serverRoutes].sort().join(",");
check(
  "las rutas del cliente y del servidor coinciden",
  sameRoutes,
  sameRoutes ? routes.map((route) => `/${route}`).join(" ") : `cliente ${routes} vs servidor ${serverRoutes}`,
);

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
