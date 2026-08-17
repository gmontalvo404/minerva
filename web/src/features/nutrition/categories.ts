import { ingredientLabels } from "./types";
import type { Ingredient } from "./types";

/**
 * The colour of each ingredient label.
 *
 * The eight hues live in styles.css as --nutrition-category-1..8, in a fixed
 * order chosen so that neighbouring pairs stay apart for colour-blind readers
 * in both themes. Slots are handed out in alphabetical order and never cycled:
 * a ninth label and beyond share the neutral rather than repeating a hue that
 * already means something else.
 *
 * The label is always written beside the colour, so adding one — which can
 * shift the others a slot along — costs nothing but the tint.
 */
const SLOTS = 8;

export type CategoryColors = Map<string, string>;

/** Every label used anywhere in the catalog, alphabetically. */
export function categoryNames(ingredients: Ingredient[]): string[] {
  const names = new Set<string>();
  for (const ingredient of ingredients) {
    for (const label of ingredientLabels(ingredient)) names.add(label);
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

export function categoryColors(ingredients: Ingredient[]): CategoryColors {
  const colors: CategoryColors = new Map();
  categoryNames(ingredients).forEach((name, index) => {
    colors.set(name, index < SLOTS ? `var(--nutrition-category-${index + 1})` : "var(--nutrition-category-rest)");
  });
  return colors;
}

/** The custom property a chip, a dot or a picker reads its hue from. */
export function categoryStyle(colors: CategoryColors, label: string | undefined) {
  const color = colors.get(String(label ?? "").trim());
  return color ? ({ "--nutrition-category-color": color } as React.CSSProperties) : undefined;
}

/** Does this ingredient carry that label? */
export function hasLabel(ingredient: Ingredient, label: string): boolean {
  return ingredientLabels(ingredient).includes(label);
}

/** What the editor writes back: a list when there are several, a plain string when one. */
export function parseLabels(typed: string): string | string[] {
  const labels = ingredientLabels({ category: typed });
  if (labels.length <= 1) return labels[0] ?? "";
  return labels;
}
