import { useState } from "react";
import { formatCop } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { categoryColors } from "./categories";
import { CategoryDots } from "./CategoryLabels";
import { ingredientLabels } from "./types";
import type { Ingredient, Meal, MealItem, MealType } from "./types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** The meal being written, before it goes into the plan. */
export interface MealDraft {
  id: string | null;
  name: string;
  description: string;
  items: MealItem[];
}

export interface MealCatalogProps {
  type: MealType;
  meals: Meal[];
  ingredients: Ingredient[];
  /** What each meal costs, priced by the server. */
  mealCosts: Record<string, number>;
  onSave: (type: MealType, draft: MealDraft) => void;
  onDelete: (type: MealType, meal: Meal) => void;
  t: Translate;
  language: Language;
}

const EMPTY_DRAFT: MealDraft = { id: null, name: "", description: "", items: [] };

/** formatNutritionQty: whole numbers stay whole, the rest keep two decimals. */
function formatQty(qty: number): string {
  const value = Number(qty) || 0;
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

/**
 * renderNutritionCatalog: the meals of one type as cards, with the editor
 * taking the place of the card being edited — a new meal opens it at the top.
 */
export function MealCatalog({
  type,
  meals,
  ingredients,
  mealCosts,
  onSave,
  onDelete,
  t,
  language,
}: MealCatalogProps) {
  const [draft, setDraft] = useState<MealDraft | null>(null);

  const sorted = [...ingredients].sort((left, right) => left.name.localeCompare(right.name));
  const colors = categoryColors(ingredients);

  const itemLabel = (item: MealItem) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredient);
    const name = ingredient ? ingredient.name : item.ingredient;
    const unit = ingredient ? ingredient.unit : "";
    return `${formatQty(item.qty)} ${unit} · ${name}`;
  };

  /** The labels of the ingredient a line refers to, for its dots. */
  const itemLabels = (item: MealItem) => {
    const ingredient = ingredients.find((candidate) => candidate.id === item.ingredient);
    return ingredient ? ingredientLabels(ingredient) : [];
  };

  const setItem = (index: number, patch: Partial<MealItem>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, position) =>
              position === index ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
  };

  const editor = (
    <form className="nutrition-meal nutrition-meal--editor" onSubmit={(event) => event.preventDefault()}>
      <div className="nutrition-field">
        <label className="field__label">{t("nutrition_meal_name")}</label>
        <input
          type="text"
          className="entry-input"
          value={draft?.name ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setDraft((current) => (current ? { ...current, name: value } : current));
          }}
        />
      </div>

      <div className="nutrition-field">
        <label className="field__label">{t("nutrition_meal_desc")}</label>
        <textarea
          className="entry-input nutrition-textarea"
          rows={2}
          value={draft?.description ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setDraft((current) => (current ? { ...current, description: value } : current));
          }}
        />
      </div>

      <div className="nutrition-field">
        <label className="field__label">{t("nutrition_meal_ingredients")}</label>
        <div className="nutrition-draft-items">
          {draft?.items.length ? (
            draft.items.map((item, index) => (
              // The row index is the identity here: two rows can hold the same
              // ingredient while one of them is being changed.
              <div className="nutrition-draft-item" key={index}>
                <select
                  className="nutrition-select"
                  value={item.ingredient}
                  onChange={(event) => setItem(index, { ingredient: event.target.value })}
                >
                  {sorted.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  className="entry-input nutrition-qty-input"
                  value={String(item.qty ?? "")}
                  onChange={(event) => setItem(index, { qty: Number(event.target.value) })}
                />
                <button
                  type="button"
                  className="nutrition-link-button nutrition-link-button--danger"
                  aria-label={t("nutrition_meal_delete")}
                  onClick={() =>
                    setDraft((current) =>
                      current
                        ? { ...current, items: current.items.filter((_, position) => position !== index) }
                        : current,
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <p className="nutrition-empty">{t("nutrition_meal_no_items")}</p>
          )}
        </div>
        <button
          type="button"
          className="nutrition-link-button"
          onClick={() =>
            setDraft((current) =>
              current
                ? {
                    ...current,
                    items: [...current.items, { ingredient: sorted[0]?.id ?? "", qty: 1 }],
                  }
                : current,
            )
          }
        >
          + {t("nutrition_meal_add_ingredient")}
        </button>
      </div>

      <div className="nutrition-meal__actions">
        <button
          type="button"
          className="button button--compact"
          onClick={() => {
            if (!draft || !draft.name.trim()) return;
            onSave(type, draft);
            setDraft(null);
          }}
        >
          {t("nutrition_meal_save")}
        </button>
        <button type="button" className="nutrition-link-button" onClick={() => setDraft(null)}>
          {t("nutrition_meal_cancel")}
        </button>
      </div>
    </form>
  );

  const editingNew = draft !== null && draft.id === null;

  return (
    <article className="card nutrition-card">
      <div className="card__head nutrition-catalog__head">
        <div>
          <h3>{t(`nutrition_tab_${type}`)}</h3>
          <p className="card__eyebrow">{t("nutrition_catalog_count", { count: meals.length })}</p>
        </div>
        <button
          type="button"
          className="button button--compact"
          onClick={() => setDraft({ ...EMPTY_DRAFT, items: [] })}
        >
          {t("nutrition_catalog_add")}
        </button>
      </div>

      {editingNew ? editor : null}
      {meals.length || editingNew ? null : <p className="nutrition-empty">{t("nutrition_catalog_empty")}</p>}

      <div className="nutrition-meal-grid">
        {meals.map((meal) =>
          draft?.id === meal.id ? (
            <div key={meal.id}>{editor}</div>
          ) : (
            <div className="nutrition-meal" key={meal.id}>
              <div className="nutrition-meal__head">
                <h4 className="nutrition-meal__name">{meal.name}</h4>
                <span className="nutrition-meal__cost">
                  {formatCop(mealCosts[meal.id] ?? 0, language)}
                </span>
              </div>
              {meal.description ? <p className="nutrition-meal__desc">{meal.description}</p> : null}
              <ul className="nutrition-meal__items">
                {(meal.items ?? []).map((item, index) => (
                  <li className="nutrition-category-marked" key={`${item.ingredient}-${index}`}>
                    <CategoryDots labels={itemLabels(item)} colors={colors} />
                    {itemLabel(item)}
                  </li>
                ))}
              </ul>
              <div className="nutrition-meal__actions">
                <button
                  type="button"
                  className="nutrition-link-button"
                  onClick={() =>
                    setDraft({
                      id: meal.id,
                      name: meal.name ?? "",
                      description: meal.description ?? "",
                      items: (meal.items ?? []).map((item) => ({ ...item })),
                    })
                  }
                >
                  {t("nutrition_meal_edit")}
                </button>
                <button
                  type="button"
                  className="nutrition-link-button nutrition-link-button--danger"
                  onClick={() => onDelete(type, meal)}
                >
                  {t("nutrition_meal_delete")}
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </article>
  );
}
