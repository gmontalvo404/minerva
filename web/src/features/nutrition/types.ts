/** The shape of finance/<dataset>/nutrition/plan.json. */

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  /**
   * One label or several: rice is a grain and a carbohydrate. Files written
   * before labels were plural still hold a plain string, and are read the same
   * way — see ingredientLabels.
   */
  category: string | string[];
  store: string;
}

/** The labels of an ingredient, blanks and repeats dropped, in file order. */
export function ingredientLabels(ingredient: { category?: string | string[] }): string[] {
  const raw = ingredient.category;
  const list = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
  const labels: string[] = [];
  for (const item of list) {
    const label = String(item ?? "").trim();
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

export interface MealItem {
  ingredient: string;
  qty: number;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  items: MealItem[];
}

export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type WeekDay = { day: string } & Partial<Record<MealType, string>>;

export interface NutritionPlan {
  ground_rules: string[][];
  condiments?: { yes: string; no: string };
  ingredients: Ingredient[];
  meals: Partial<Record<MealType, Meal[]>>;
  week: WeekDay[];
  excluded_ingredients?: string[];
}

export const EMPTY_PLAN: NutritionPlan = {
  ground_rules: [],
  ingredients: [],
  meals: {},
  week: [],
  excluded_ingredients: [],
};

export interface ShoppingLine {
  id: string;
  name: string;
  unit: string;
  category: string;
  store: string;
  qty: number;
  price: number;
  total: number;
}
