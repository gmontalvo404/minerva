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
import { ThemeToggle, ViewSwitch } from "./ui";
import type { ViewSwitchOption } from "./ui";

export type Theme = "light" | "dark";
const SECTIONS = ["cashflow", "debts", "credit", "nutrition"] as const;
export type Section = (typeof SECTIONS)[number];

function normalizeSection(value: unknown): Section {
  const section = String(value ?? "").trim().toLowerCase();
  return (SECTIONS as readonly string[]).includes(section) ? (section as Section) : "cashflow";
}

/** One path per section: /cashflow, /debts, /credit, /nutrition. */
const SECTION_PATHS: Record<Section, string> = {
  cashflow: "/cashflow",
  debts: "/debts",
  credit: "/credit",
  nutrition: "/nutrition",
};

/** The path the browser is on, or "" while rendering on the server. */
function currentPath(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

function sectionFromPath(pathname: string): Section | null {
  const clean = `/${pathname.replace(/^\/+|\/+$/g, "").toLowerCase()}`;
  return SECTIONS.find((section) => SECTION_PATHS[section] === clean) ?? null;
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
  // The address decides which section is open; the remembered one is the
  // fallback for when you arrive at the bare root.
  const [section, setSection] = useState<Section>(
    () => sectionFromPath(currentPath()) ?? normalizeSection(readStorage(STORAGE_KEYS.appMode)),
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

    const path = SECTION_PATHS[section];
    if (window.location.pathname === path) return;
    // Coming from a section is navigation and deserves a history entry; landing
    // on "/" and being sent to the remembered one is just an address fix.
    const arrivedOnASection = sectionFromPath(window.location.pathname) !== null;
    const url = path + window.location.search + window.location.hash;
    if (arrivedOnASection) {
      window.history.pushState({ section }, "", url);
    } else {
      window.history.replaceState({ section }, "", url);
    }
  }, [section]);

  // Back and forward move between sections instead of leaving the app.
  useEffect(() => {
    const onPopState = () => {
      const next = sectionFromPath(window.location.pathname);
      if (next) setSection(next);
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
    const key = `${STORAGE_KEYS.scroll}:${section}`;

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
  }, [section]);

  const t = (key: string, params: Record<string, string | number> = {}) => translate(language, key, params);

  const sectionOptions: ViewSwitchOption<Section>[] = [
    { value: "cashflow", label: t("app_section_cash_flow") },
    { value: "debts", label: t("app_section_debts") },
    { value: "credit", label: t("app_section_credit") },
    { value: "nutrition", label: t("app_section_nutrition") },
  ];

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
        <div className="control-sidebar__inner">{sidebar}</div>
      </aside>

      <div className="content-shell" ref={contentRef}>
        <main className="layout">
          {section === "cashflow" ? <CashFlowPage {...pageProps} /> : null}
          {section === "debts" ? <DebtsPage {...pageProps} /> : null}
          {section === "credit" ? <CreditPage language={language} onSidebar={setSidebar} /> : null}
          {section === "nutrition" ? <NutritionPage {...pageProps} /> : null}
        </main>
      </div>
    </div>
  );
}
