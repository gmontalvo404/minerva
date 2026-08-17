import { categoryColors, categoryNames, categoryStyle, hasLabel } from "./categories";
import { CategoryPicker } from "./CategoryPicker";
import type { Ingredient } from "./types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface WeekExclusionsProps {
  ingredients: Ingredient[];
  excluded: string[];
  onChange: (excluded: string[]) => void;
  t: Translate;
}

/**
 * What the week is not allowed to use, inside the week's own card: one picker
 * per label to take a food out, and the ones already out as chips you can put
 * back. Meals using an excluded food stop being listed and stop coming up in
 * the dice.
 *
 * An ingredient with several labels is reachable from each of them, so rice
 * can be taken out from "Granos y harinas" or from "Carbohidratos".
 */
export function WeekExclusions({ ingredients, excluded, onChange, t }: WeekExclusionsProps) {
  const set = new Set(excluded);
  const colors = categoryColors(ingredients);
  const countOf = (label: string) =>
    ingredients.filter((ingredient) => hasLabel(ingredient, label)).length;
  // Biggest label first; its colour still comes from the alphabetical slot, so
  // growing or shrinking a category reorders the row without repainting it.
  const labels = categoryNames(ingredients)
    .filter(Boolean)
    .sort((left, right) => countOf(right) - countOf(left) || left.localeCompare(right));
  const chosen = ingredients
    .filter((ingredient) => set.has(ingredient.id))
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <section className="nutrition-exclude-block">
      <p className="card__eyebrow">{t("nutrition_exclude_hint")}</p>

      <div className="nutrition-category-filters">
        {labels.map((label) => {
          const members = ingredients.filter((ingredient) => hasLabel(ingredient, label));
          const available = members
            .filter((ingredient) => !set.has(ingredient.id))
            .sort((left, right) => left.name.localeCompare(right.name));
          const out = members.length - available.length;
          const state = available.length === 0 ? " is-empty" : out > 0 ? " is-partial" : "";

          return (
            <CategoryPicker
              key={label}
              label={label}
              count={out > 0 ? `${out}/${members.length}` : String(members.length)}
              style={categoryStyle(colors, label)}
              state={state}
              options={available.map((ingredient) => ({ id: ingredient.id, name: ingredient.name }))}
              onPick={(id) => onChange([...excluded, id])}
              menuLabel={t("nutrition_exclude_add")}
            />
          );
        })}
      </div>

      <div className="nutrition-exclude-tags">
        {chosen.length ? (
          <>
            {chosen.map((ingredient) => (
              <span className="nutrition-exclude-tag" key={ingredient.id}>
                {ingredient.name}
                <button
                  type="button"
                  className="nutrition-exclude-remove"
                  aria-label={t("nutrition_meal_delete")}
                  onClick={() => onChange(excluded.filter((item) => item !== ingredient.id))}
                >
                  ✕
                </button>
              </span>
            ))}
            {/* Only worth showing once there is more than one to undo. */}
            {chosen.length > 1 ? (
              <button
                type="button"
                className="nutrition-link-button nutrition-exclude-clear"
                onClick={() => onChange([])}
              >
                {t("nutrition_exclude_clear")}
              </button>
            ) : null}
          </>
        ) : (
          <span className="nutrition-empty">{t("nutrition_exclude_empty")}</span>
        )}
      </div>
    </section>
  );
}
