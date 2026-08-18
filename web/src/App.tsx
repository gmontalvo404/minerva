import { useEffect, useRef, useState } from "react";
import { CashFlowPage } from "./features/cashflow/CashFlowPage";
import { CreditPage } from "./features/credit/CreditPage";
import { DebtsPage } from "./features/debts/DebtsPage";
import { NutritionPage } from "./features/nutrition/NutritionPage";
import { normalizeDataset } from "./lib/dataset";
import type { Dataset } from "./lib/dataset";
import { normalizeLanguage, translate } from "./lib/i18n";
import type { Language } from "./lib/i18n";
import { readStorage, STORAGE_KEYS, writeStorage } from "./lib/storage";
import { Select, ThemeToggle, ViewSwitch } from "./ui";
import type { ViewSwitchOption } from "./ui";

export type Theme = "light" | "dark";

/** The two top-level sections. */
const SECTIONS = ["finances", "nutrition"] as const;
export type Section = (typeof SECTIONS)[number];

/** What lives inside Finances, in the order the sidebar lists it. */
const FINANCE_MODULES = ["cashflow", "debts", "credit"] as const;
export type FinanceModule = (typeof FINANCE_MODULES)[number];

function normalizeSection(value: unknown): Section {
  const section = String(value ?? "").trim().toLowerCase();
  if ((SECTIONS as readonly string[]).includes(section)) return section as Section;
  // What the flat version remembered: cashflow, debts and credit were sections
  // of their own, and all three moved inside Finances.
  return "finances";
}

function normalizeModule(value: unknown): FinanceModule {
  const module = String(value ?? "").trim().toLowerCase();
  return (FINANCE_MODULES as readonly string[]).includes(module) ? (module as FinanceModule) : "cashflow";
}

/** One path per section, and one per module under Finances. */
const SECTION_PATHS: Record<Section, string> = {
  finances: "/finances",
  nutrition: "/nutrition",
};
const MODULE_PATHS: Record<FinanceModule, string> = {
  cashflow: "/finances/cashflow",
  debts: "/finances/debts",
  credit: "/finances/credit",
};

/** Finances always has one of its modules open, so its address names it too. */
function canonicalPath(section: Section, module: FinanceModule): string {
  return section === "finances" ? MODULE_PATHS[module] : SECTION_PATHS[section];
}

/** The path the browser is on, or "" while rendering on the server. */
function currentPath(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

type Route = { section: Section; module?: FinanceModule; canonical: boolean };

/**
 * An address read back into a place in the app.
 *
 * `module` is absent on a bare /finances: that one is answered by whichever
 * module was last open. `canonical` separates the addresses the app writes from
 * the ones it merely accepts — /finances on its own, and the flat /debts of the
 * version before Finances existed — so those get corrected in place instead of
 * leaving a history entry for the back button to land on.
 */
function routeFromPath(pathname: string): Route | null {
  const clean = `/${pathname.replace(/^\/+|\/+$/g, "").toLowerCase()}`;
  if (clean === SECTION_PATHS.nutrition) return { section: "nutrition", canonical: true };

  const nested = FINANCE_MODULES.find((module) => MODULE_PATHS[module] === clean);
  if (nested) return { section: "finances", module: nested, canonical: true };

  if (clean === SECTION_PATHS.finances) return { section: "finances", canonical: false };

  const flat = FINANCE_MODULES.find((module) => `/${module}` === clean);
  return flat ? { section: "finances", module: flat, canonical: false } : null;
}

/**
 * The shell, with the same skeleton as index.html: hero header with the section
 * switch and the tools, the control sidebar on the left, and the content shell
 * where each section renders its panels.
 *
 * Each page owns the contents of the sidebar for its section, so the controls
 * sit where they always did.
 */
export function App() {
  const [dataset, setDataset] = useState<Dataset>(() => normalizeDataset(readStorage(STORAGE_KEYS.dataset)));
  const [language, setLanguage] = useState<Language>(() =>
    normalizeLanguage(readStorage(STORAGE_KEYS.language)),
  );
  const [theme, setTheme] = useState<Theme>(() =>
    readStorage(STORAGE_KEYS.theme) === "dark" ? "dark" : "light",
  );
  // The address decides where the app opens; what was remembered fills the
  // blanks — the bare root, or /finances without a module.
  const [section, setSection] = useState<Section>(
    () => routeFromPath(currentPath())?.section ?? normalizeSection(readStorage(STORAGE_KEYS.appMode)),
  );
  const [financeModule, setFinanceModule] = useState<FinanceModule>(
    () =>
      routeFromPath(currentPath())?.module ??
      // The flat version kept the open module under appMode, so reading it as
      // the fallback makes an upgrade open where it was left.
      normalizeModule(readStorage(STORAGE_KEYS.financeModule) ?? readStorage(STORAGE_KEYS.appMode)),
  );
  const [sidebar, setSidebar] = useState<React.ReactNode>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStorage(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    writeStorage(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.dataset, dataset);
  }, [dataset]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.appMode, section);
    writeStorage(STORAGE_KEYS.financeModule, financeModule);

    const path = canonicalPath(section, financeModule);
    if (window.location.pathname === path) return;
    // Coming from an address the app wrote is navigation and deserves a history
    // entry; anything else — "/", a bare /finances, a flat address from the
    // previous version — is that address being corrected, not a move.
    const arrived = routeFromPath(window.location.pathname);
    const url = path + window.location.search + window.location.hash;
    const state = { section, module: financeModule };
    if (arrived?.canonical) {
      window.history.pushState(state, "", url);
    } else {
      window.history.replaceState(state, "", url);
    }
  }, [section, financeModule]);

  // Back and forward move between sections instead of leaving the app.
  useEffect(() => {
    const onPopState = () => {
      const route = routeFromPath(window.location.pathname);
      if (!route) return;
      setSection(route.section);
      if (route.module) setFinanceModule(route.module);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /**
   * What scrolls is .content-shell, not the window, so the browser restores
   * nothing on reload. Remember the offset of each section and put it back once
   * its data has rendered and the shell is tall enough to hold it again.
   */
  useEffect(() => {
    const shell = contentRef.current;
    if (!shell) return;
    // Each module keeps its own offset: cash flow and debts are different reads.
    const key = `${STORAGE_KEYS.scroll}:${canonicalPath(section, financeModule)}`;

    let frame = 0;
    const remember = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => writeStorage(key, String(shell.scrollTop)));
    };
    shell.addEventListener("scroll", remember, { passive: true });

    const target = Number(readStorage(key) ?? 0);
    let attempts = 0;
    const restore = () => {
      if (!target || shell.scrollTop === target) return;
      // The data arrives after this runs, so wait until the content is there.
      if (shell.scrollHeight - shell.clientHeight >= target) {
        shell.scrollTop = target;
        return;
      }
      if (attempts++ < 180) requestAnimationFrame(restore);
    };
    requestAnimationFrame(restore);

    // If the reader starts scrolling while the data is still arriving, their
    // position wins: give up on restoring instead of yanking them back.
    const giveUp = () => {
      attempts = 180;
    };
    shell.addEventListener("wheel", giveUp, { passive: true, once: true });
    shell.addEventListener("touchstart", giveUp, { passive: true, once: true });

    return () => {
      shell.removeEventListener("scroll", remember);
      shell.removeEventListener("wheel", giveUp);
      shell.removeEventListener("touchstart", giveUp);
      cancelAnimationFrame(frame);
      attempts = 180;
    };
  }, [section, financeModule]);

  const t = (key: string, params: Record<string, string | number> = {}) => translate(language, key, params);

  const sectionOptions: ViewSwitchOption<Section>[] = [
    { value: "finances", label: t("app_section_finances") },
    { value: "nutrition", label: t("app_section_nutrition") },
  ];

  const moduleLabels: Record<FinanceModule, string> = {
    cashflow: t("app_section_cash_flow"),
    debts: t("app_section_debts"),
    credit: t("app_section_credit"),
  };

  const datasetOptions: ViewSwitchOption<Dataset>[] = [
    { value: "live", label: "Live", title: t("dataset_live_hint") },
    { value: "demo", label: "Demo", title: t("dataset_demo_hint") },
  ];

  // Same order as index.html: EN first, ES second.
  const languageOptions: ViewSwitchOption<Language>[] = [
    { value: "en", label: "EN" },
    { value: "es", label: "ES" },
  ];

  const pageProps = { dataset, language, onSidebar: setSidebar };

  return (
    <div className="app-shell">
      <header className="hero hero--section">
        <div className="hero__section-brand">
          <h1>{t("app_header_title")}</h1>
        </div>
        <div className="hero__section">
          <ViewSwitch
            options={sectionOptions}
            value={section}
            onChange={setSection}
            label={t("app_header_title")}
            variant="app-mode-switch"
            dataAttribute="app-mode"
          />
        </div>
        <div className="hero__tools">
          <ViewSwitch
            options={datasetOptions}
            value={dataset}
            onChange={setDataset}
            label="Dataset"
            variant="dataset-switch"
            dataAttribute="dataset"
          />
          <ViewSwitch
            options={languageOptions}
            value={language}
            onChange={setLanguage}
            label="Idioma"
            variant="language-switch"
            dataAttribute="language"
          />
          <ThemeToggle
            theme={theme}
            onChange={setTheme}
            label={theme === "dark" ? t("theme_toggle_to_light") : t("theme_toggle_to_dark")}
          />
        </div>
      </header>

      <aside className="control-sidebar">
        <div className="control-sidebar__inner">
          {/* Which module of Finances is open belongs here, above whatever
              controls that module puts in the sidebar for itself. It is the
              same dropdown the year uses right below it, so one pick reads
              like the other. */}
          {section === "finances" ? (
            <div className="control-sidebar__controls">
              <div className="field">
                <span className="field__label">{t("module_label")}</span>
                <Select
                  label={t("module_label")}
                  options={FINANCE_MODULES.map((module) => ({
                    value: module,
                    label: moduleLabels[module],
                  }))}
                  value={financeModule}
                  onChange={setFinanceModule}
                />
              </div>
            </div>
          ) : null}
          {sidebar}
        </div>
      </aside>

      <div className="content-shell" ref={contentRef}>
        <main className="layout">
          {section === "finances" && financeModule === "cashflow" ? <CashFlowPage {...pageProps} /> : null}
          {section === "finances" && financeModule === "debts" ? <DebtsPage {...pageProps} /> : null}
          {section === "finances" && financeModule === "credit" ? (
            <CreditPage language={language} onSidebar={setSidebar} />
          ) : null}
          {section === "nutrition" ? <NutritionPage {...pageProps} /> : null}
        </main>
      </div>
    </div>
  );
}
