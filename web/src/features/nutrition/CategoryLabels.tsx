import { categoryStyle } from "./categories";
import type { CategoryColors } from "./categories";

export interface CategoryChipsProps {
  /** Optional because a server from before the field answers without it. */
  labels: string[] | undefined;
  colors: CategoryColors;
}

/** Every label of an ingredient, each a dot in its colour and a name in ink. */
export function CategoryChips({ labels, colors }: CategoryChipsProps) {
  if (!labels?.length) return null;

  return (
    <span className="nutrition-category-chips">
      {labels.map((label) => (
        <span className="nutrition-category-chip" style={categoryStyle(colors, label)} key={label}>
          {label}
        </span>
      ))}
    </span>
  );
}

export interface CategoryDotsProps {
  labels: string[];
  colors: CategoryColors;
}

/** The same identity without the names, for places too tight to spell them. */
export function CategoryDots({ labels, colors }: CategoryDotsProps) {
  return (
    <span className="nutrition-category-dots">
      {labels.map((label) => (
        <span className="nutrition-category-dot" style={categoryStyle(colors, label)} key={label} />
      ))}
    </span>
  );
}
