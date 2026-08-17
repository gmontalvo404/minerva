import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  EMPTY_NUTRITION_COSTS,
  getNutritionPlan,
  getShoppingList,
  saveNutritionPlan,
} from "../../lib/api";
import type { NutritionCosts } from "../../lib/api";
import { nutritionPath } from "../../lib/dataset";
import type { Dataset } from "../../lib/dataset";
import { formatCop } from "../../lib/format";
import { translate } from "../../lib/i18n";
import type { Language } from "../../lib/i18n";
import { KpiCard, MonthNav, Panel } from "../../ui";
import { categoryColors, categoryNames } from "./categories";
import { CategoryChips } from "./CategoryLabels";
import { LabelEditor } from "./LabelEditor";
import { MealPicker } from "./MealPicker";
import { WeekExclusions } from "./WeekExclusions";
import { MealCatalog } from "./MealCatalog";
import type { MealDraft } from "./MealCatalog";
import { EMPTY_PLAN, MEAL_TYPES, ingredientLabels } from "./types";
import type { Ingredient, Meal, MealType, NutritionPlan, WeekDay } from "./types";

/** NUTRITION_TABS, in the order the original lists them. */
const TABS = ["rules", "plan", "ingredients", "breakfast", "lunch", "dinner", "snack"] as const;
type Tab = (typeof TABS)[number];

/** The order the weekly plan puts the four slots in. */
const SLOTS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export interface NutritionPageProps {
  dataset: Dataset;
  language: Language;
  onSidebar: (node: React.ReactNode) => void;
}

/** formatNutritionQty: whole numbers stay whole, the rest keep two decimals. */
function formatQty(qty: number): string {
  const value = Number(qty) || 0;
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

/** nutritionMealId: a slug of the name, prefixed by the type's first letter. */
function mealId(plan: NutritionPlan, type: MealType, name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const base = `${type[0] ?? "m"}_${slug || "meal"}`;
  const taken = new Set(Object.values(plan.meals).flatMap((list) => (list ?? []).map((meal) => meal.id)));

  let id = base;
  let suffix = 2;
  while (taken.has(id)) {
    id = `${base}_${suffix}`;
    suffix += 1;
  }
  return id;
}

/** nutritionNewIngredientId: ing_1, ing_2, … the first one free. */
function ingredientId(plan: NutritionPlan): string {
  const taken = new Set(plan.ingredients.map((item) => item.id));
  let index = 1;
  while (taken.has(`ing_${index}`)) index += 1;
  return `ing_${index}`;
}

export function NutritionPage({ dataset, language, onSidebar }: NutritionPageProps) {
  const t = useCallback(
    (key: string, params: Record<string, string | number> = {}) => translate(language, key, params),
    [language],
  );

  const [plan, setPlan] = useState<NutritionPlan>(EMPTY_PLAN);
  const [tab, setTab] = useState<Tab>("plan");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Prices and KPIs, all of them computed by the server. */
  const [costs, setCosts] = useState<NutritionCosts>(EMPTY_NUTRITION_COSTS);

  const path = nutritionPath(dataset);

  // scheduleNutritionSave: typing updates the screen at once and the file a
  // moment later, so a name being typed is not one POST per keystroke.
  const timer = useRef<number | null>(null);
  /** Hash of the plan bytes the edits are based on; travels with every save. */
  const baseHash = useRef<string | null>(null);
  /** Saves run one at a time, each on the hash the previous one returned. */
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  /** Bumped when a conflict reloads the plan: edits queued before it are stale. */
  const generation = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getNutritionPlan<NutritionPlan>(path, EMPTY_PLAN)
      .then(({ document, hash }) => {
        if (cancelled) return;
        baseHash.current = hash;
        setPlan({ ...EMPTY_PLAN, ...document });
      })
      .catch(() => {
        if (!cancelled) setError(t("load_error_title"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, t]);

  const update = useCallback(
    (next: NutritionPlan) => {
      setPlan(next);
      setStatus(null);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        const startedIn = generation.current;
        saveChain.current = saveChain.current.then(async () => {
          // A conflict replaced the plan while this edit waited: it was built
          // on the version that lost, so writing it would repeat the clobber.
          if (startedIn !== generation.current) return;
          try {
            const saved = await saveNutritionPlan(path, next, baseHash.current);
            baseHash.current = saved.hash ?? null;
            await getShoppingList(path).then(setCosts).catch(() => undefined);
          } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
              // The file moved under us — another tab, the other app. The
              // newer version wins; this tab reloads it and says so.
              generation.current += 1;
              const fresh = await getNutritionPlan<NutritionPlan>(path, EMPTY_PLAN).catch(() => null);
              if (fresh) {
                baseHash.current = fresh.hash;
                setPlan({ ...EMPTY_PLAN, ...fresh.document });
              }
              setStatus(t("nutrition_conflict"));
              return;
            }
            setStatus(t("save_entry_error"));
          }
        });
      }, 400);
    },
    [path, t],
  );

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  /**
   * A save writes the whole plan from memory, so a tab left open holds a
   * document that may already be stale — and the next edit in it would put the
   * old version back over whatever changed meanwhile. Coming back to the tab
   * re-reads the file first, unless there is an edit of ours still pending.
   * (The server's base-hash check is the backstop when both race anyway.)
   */
  useEffect(() => {
    const reread = () => {
      if (document.visibilityState !== "visible" || timer.current !== null) return;
      saveChain.current = saveChain.current.then(async () => {
        if (timer.current !== null) return;
        const fresh = await getNutritionPlan<NutritionPlan>(path, EMPTY_PLAN).catch(() => null);
        if (fresh === null) return;
        baseHash.current = fresh.hash;
        setPlan({ ...EMPTY_PLAN, ...fresh.document });
      });
    };

    document.addEventListener("visibilitychange", reread);
    window.addEventListener("focus", reread);
    return () => {
      document.removeEventListener("visibilitychange", reread);
      window.removeEventListener("focus", reread);
    };
  }, [path]);

  useEffect(() => {
    void getShoppingList(path)
      .then(setCosts)
      .catch(() => setCosts(EMPTY_NUTRITION_COSTS));
  }, [path]);

  useEffect(() => {
    onSidebar(
      <div className="control-sidebar__nutrition-view">
        <div className="field control-sidebar__view">
          <span className="field__label">{t("view_label")}</span>
          <section className="control-sidebar__months">
            <MonthNav
              wrapperClassName={null}
              buttonClassName="control-sidebar__annual-button"
              options={TABS.map((value) => ({ value, label: t(`nutrition_tab_${value}`) }))}
              value={tab}
              onChange={setTab}
            />
          </section>
        </div>
      </div>,
    );
  }, [onSidebar, tab, t]);

  const excluded = new Set(plan.excluded_ingredients ?? []);
  const colors = categoryColors(plan.ingredients);
  /** Every label already in use, to offer them when tagging an ingredient. */
  const knownLabels = categoryNames(plan.ingredients).filter(Boolean);

  /** mealUsesExcluded: a meal disappears from the pickers if it uses one. */
  const usesExcluded = (meal: Meal) => (meal.items ?? []).some((item) => excluded.has(item.ingredient));

  const availableMeals = (type: MealType) => (plan.meals[type] ?? []).filter((meal) => !usesExcluded(meal));

  const findMeal = (type: MealType, id: string | null | undefined) =>
    id ? (plan.meals[type] ?? []).find((meal) => meal.id === id) ?? null : null;

  const costOf = (id: string | null | undefined) => (id ? costs.mealCosts[id] ?? 0 : 0);

  /** randomizeNutritionDay: one random meal per slot, excluded ones left out. */
  const randomDay = (day: WeekDay): WeekDay => {
    const next: WeekDay = { ...day };
    for (const type of MEAL_TYPES) {
      const options = availableMeals(type);
      next[type] = options.length
        ? options[Math.floor(Math.random() * options.length)]?.id ?? undefined
        : undefined;
    }
    return next;
  };

  const setDay = (index: number, day: WeekDay) => {
    update({ ...plan, week: plan.week.map((current, position) => (position === index ? day : current)) });
  };

  const saveMeal = (type: MealType, draft: MealDraft) => {
    const name = draft.name.trim();
    const items = draft.items
      .filter((item) => item.ingredient)
      .map((item) => ({ ingredient: item.ingredient, qty: Number(item.qty) || 0 }));
    const list = plan.meals[type] ?? [];

    const meals = draft.id
      ? list.map((meal) =>
          meal.id === draft.id ? { ...meal, name, description: draft.description.trim(), items } : meal,
        )
      : [...list, { id: mealId(plan, type, name), name, description: draft.description.trim(), items }];

    update({ ...plan, meals: { ...plan.meals, [type]: meals } });
  };

  const deleteMeal = (type: MealType, meal: Meal) => {
    if (!window.confirm(t("nutrition_meal_delete_confirm", { name: meal.name || meal.id }))) return;
    // The days that had it go back to empty, like the original does.
    const week = plan.week.map((day) => {
      const next: WeekDay = { ...day };
      for (const slot of MEAL_TYPES) {
        if (next[slot] === meal.id) next[slot] = undefined;
      }
      return next;
    });
    update({
      ...plan,
      week,
      meals: { ...plan.meals, [type]: (plan.meals[type] ?? []).filter((item) => item.id !== meal.id) },
    });
  };

  const setIngredient = (id: string, patch: Partial<Ingredient>) => {
    update({
      ...plan,
      ingredients: plan.ingredients.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const deleteIngredient = (ingredient: Ingredient) => {
    if (!window.confirm(t("nutrition_ingredient_delete_confirm", { name: ingredient.name || ingredient.id })))
      return;
    // It also leaves every meal that listed it, and the excluded list.
    const meals = Object.fromEntries(
      Object.entries(plan.meals).map(([type, list]) => [
        type,
        (list ?? []).map((meal) => ({
          ...meal,
          items: (meal.items ?? []).filter((item) => item.ingredient !== ingredient.id),
        })),
      ]),
    );
    update({
      ...plan,
      ingredients: plan.ingredients.filter((item) => item.id !== ingredient.id),
      meals,
      excluded_ingredients: (plan.excluded_ingredients ?? []).filter((item) => item !== ingredient.id),
    });
  };

  if (loading && plan === EMPTY_PLAN) {
    return (
      <Panel eyebrow={t("app_section_nutrition")} title={t("nutrition_title")}>
        <p className="section-head__note">{t("status_loading")}</p>
      </Panel>
    );
  }

  const catalogType = MEAL_TYPES.find((type) => type === tab);

  return (
    <Panel
      eyebrow={t("app_section_nutrition")}
      title={t("nutrition_title")}
      note={status ?? error ?? t("nutrition_note")}
    >
      {tab === "plan" ? (
        <>
          {/* The four figures speak for themselves: no heading over them. */}
          <section className="nutrition-summary">
            <div className="kpi-grid nutrition-kpi-grid">
              <KpiCard label={t("nutrition_kpi_weekly_cost")} value={formatCop(costs.weeklyCost, language)} />
              <KpiCard label={t("nutrition_kpi_daily_avg")} value={formatCop(costs.dailyAverage, language)} />
              <KpiCard
                label={t("nutrition_kpi_meals")}
                value={`${costs.assignedMeals} / ${costs.totalSlots}`}
              />
              <KpiCard label={t("nutrition_kpi_ingredients")} value={String(costs.lines.length)} />
            </div>
          </section>

          <article className="card nutrition-card">
            <div className="card__head nutrition-catalog__head">
              <div>
                <p className="card__eyebrow">{t("nutrition_plan_eyebrow")}</p>
                <h3>{t("nutrition_plan_table_title")}</h3>
              </div>
              <button
                type="button"
                className="button button--compact nutrition-random-btn"
                onClick={() => update({ ...plan, week: plan.week.map(randomDay) })}
              >
                🎲 {t("nutrition_random_week")}
              </button>
            </div>

            <WeekExclusions
              ingredients={plan.ingredients}
              excluded={plan.excluded_ingredients ?? []}
              onChange={(next) => update({ ...plan, excluded_ingredients: next })}
              t={t}
            />

            <div className="nutrition-table-fit">
              <table className="data-table data-table--nutrition data-table--nutrition-plan">
                <thead>
                  <tr>
                    <th>{t("nutrition_col_day")}</th>
                    {SLOTS.map((type) => (
                      <th key={type}>{t(`nutrition_col_${type}`)}</th>
                    ))}
                    <th>{t("nutrition_plan_day_total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.week.map((day, dayIndex) => (
                    <tr key={`${day.day}-${dayIndex}`}>
                      <td className="nutrition-cell-strong nutrition-day-cell">
                        <div className="nutrition-day-inner">
                          <span className="nutrition-day-name">{day.day || `Día ${dayIndex + 1}`}</span>
                          <button
                            type="button"
                            className="nutrition-dice"
                            title={t("nutrition_random_day")}
                            aria-label={t("nutrition_random_day")}
                            onClick={() => setDay(dayIndex, randomDay(day))}
                          >
                            🎲
                          </button>
                        </div>
                      </td>

                      {SLOTS.map((type) => {
                        const id = day[type] ?? "";
                        const meal = findMeal(type, id);
                        // The meal already picked stays listed even when an
                        // exclusion would have hidden it.
                        const options = availableMeals(type);
                        const listed =
                          meal && !options.some((item) => item.id === meal.id) ? [meal, ...options] : options;

                        return (
                          <td className="nutrition-plan-cell" key={type}>
                            <MealPicker
                              value={id}
                              display={meal ? meal.name : t("nutrition_none_option")}
                              isEmpty={!meal}
                              options={listed.map((item) => ({ id: item.id, name: item.name }))}
                              noneLabel={t("nutrition_none_option")}
                              onChange={(next) => setDay(dayIndex, { ...day, [type]: next || undefined })}
                              label={`${day.day || `Día ${dayIndex + 1}`} · ${t(`nutrition_col_${type}`)}`}
                            />
                          </td>
                        );
                      })}

                      <td className="nutrition-plan-total">
                        {formatCop(
                          SLOTS.reduce((sum, type) => sum + costOf(day[type]), 0),
                          language,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card nutrition-card">
            <div className="card__head nutrition-catalog__head">
              <div>
                <p className="card__eyebrow">{t("nutrition_shopping_eyebrow")}</p>
                <h3>{t("nutrition_shopping_title")}</h3>
                <p className="card__note">{t("nutrition_shopping_hint")}</p>
              </div>
              <span className="nutrition-shopping-total">
                {t("nutrition_shopping_total")}: {formatCop(costs.total, language)}
              </span>
            </div>

            {costs.lines.length ? (
              <div className="nutrition-table-fit">
                <table className="data-table data-table--nutrition data-table--nutrition-shopping">
                  <thead>
                    <tr>
                      <th>{t("nutrition_shopping_col_ingredient")}</th>
                      <th>{t("nutrition_shopping_col_category")}</th>
                      <th>{t("nutrition_shopping_col_qty")}</th>
                      <th>{t("nutrition_shopping_col_price")}</th>
                      <th>{t("nutrition_shopping_col_total")}</th>
                      <th>{t("nutrition_shopping_col_store")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="nutrition-cell-strong">{line.name}</td>
                        <td className="nutrition-shop-category">
                          <CategoryChips labels={line.categories} colors={colors} />
                        </td>
                        <td>
                          {formatQty(line.qty)} {line.unit}
                        </td>
                        <td className="nutrition-price-cell">
                          <div className="nutrition-price-field">
                            <span className="nutrition-price-currency">$</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="entry-input nutrition-price-input"
                              value={String(line.price)}
                              onChange={(event) =>
                                setIngredient(line.id, { price_per_unit: Number(event.target.value) || 0 })
                              }
                            />
                            <span className="nutrition-price-unit">/{line.unit}</span>
                          </div>
                        </td>
                        <td className="nutrition-plan-total">{formatCop(line.total, language)}</td>
                        <td className="nutrition-shop-store">{line.store}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="nutrition-empty">{t("nutrition_shopping_empty")}</p>
            )}
          </article>
        </>
      ) : null}

      {tab === "ingredients" ? (
        <article className="card nutrition-card">
          <div className="card__head nutrition-catalog__head">
            <div>
              <p className="card__eyebrow">{t("nutrition_catalog_eyebrow")}</p>
              <h3>{t("nutrition_tab_ingredients")}</h3>
              <p className="card__note">
                {t("nutrition_catalog_count", { count: plan.ingredients.length })}
              </p>
            </div>
            <button
              type="button"
              className="button button--compact nutrition-random-btn"
              onClick={() =>
                update({
                  ...plan,
                  ingredients: [
                    ...plan.ingredients,
                    {
                      id: ingredientId(plan),
                      name: "",
                      unit: "unidad",
                      price_per_unit: 0,
                      category: "",
                      store: "",
                    },
                  ],
                })
              }
            >
              {t("nutrition_ingredients_add")}
            </button>
          </div>

          <div className="nutrition-table-fit">
            <table className="data-table data-table--nutrition data-table--nutrition-ingredients">
              <thead>
                <tr>
                  <th>{t("nutrition_ing_name")}</th>
                  <th>{t("nutrition_ing_category")}</th>
                  <th>{t("nutrition_ing_unit")}</th>
                  <th>{t("nutrition_ing_price")}</th>
                  <th>{t("nutrition_ing_store")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plan.ingredients.map((ingredient) => (
                  <tr key={ingredient.id}>
                    <td>
                      <input
                        type="text"
                        className="entry-input"
                        value={ingredient.name}
                        onChange={(event) => setIngredient(ingredient.id, { name: event.target.value })}
                      />
                    </td>
                    <td>
                      <LabelEditor
                        labels={ingredientLabels(ingredient)}
                        known={knownLabels}
                        colors={colors}
                        onChange={(labels) => setIngredient(ingredient.id, { category: labels })}
                        t={t}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="entry-input nutrition-unit-input"
                        value={ingredient.unit}
                        onChange={(event) => setIngredient(ingredient.id, { unit: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="entry-input"
                        value={String(ingredient.price_per_unit ?? 0)}
                        onChange={(event) =>
                          setIngredient(ingredient.id, { price_per_unit: Number(event.target.value) || 0 })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="entry-input"
                        value={ingredient.store}
                        onChange={(event) => setIngredient(ingredient.id, { store: event.target.value })}
                      />
                    </td>
                    <td className="nutrition-ing-actions">
                      <button
                        type="button"
                        className="nutrition-link-button nutrition-link-button--danger"
                        onClick={() => deleteIngredient(ingredient)}
                      >
                        {t("nutrition_meal_delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {catalogType ? (
        <MealCatalog
          type={catalogType}
          meals={plan.meals[catalogType] ?? []}
          ingredients={plan.ingredients}
          mealCosts={costs.mealCosts}
          onSave={saveMeal}
          onDelete={deleteMeal}
          t={t}
          language={language}
        />
      ) : null}

      {tab === "rules" ? (
        <>
          <article className="card nutrition-card">
            <div className="card__head">
              <div>
                <p className="card__eyebrow">{t("nutrition_rules_eyebrow")}</p>
                <h3>{t("nutrition_rules_title")}</h3>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table data-table--nutrition">
                <thead>
                  <tr>
                    <th>{t("nutrition_rules_col_rule")}</th>
                    <th>{t("nutrition_rules_col_value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.ground_rules.map((rule, index) => (
                    <tr key={`${rule[0] ?? ""}-${index}`}>
                      <td className="nutrition-cell-strong">{rule[0]}</td>
                      <td>{rule[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card nutrition-card">
            <div className="card__head">
              <div>
                <p className="card__eyebrow">{t("nutrition_rules_eyebrow")}</p>
                <h3>{t("nutrition_condiments_title")}</h3>
              </div>
            </div>
            <div className="nutrition-condiments">
              <div className="nutrition-condiments__item nutrition-condiments__item--yes">
                <p className="card__eyebrow">{t("nutrition_condiments_yes")}</p>
                <p>{plan.condiments?.yes ?? ""}</p>
              </div>
              <div className="nutrition-condiments__item nutrition-condiments__item--no">
                <p className="card__eyebrow">{t("nutrition_condiments_no")}</p>
                <p>{plan.condiments?.no ?? ""}</p>
              </div>
            </div>
          </article>
        </>
      ) : null}
    </Panel>
  );
}
