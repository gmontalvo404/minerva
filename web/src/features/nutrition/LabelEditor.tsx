import { useRef, useState } from "react";
import { categoryStyle } from "./categories";
import type { CategoryColors } from "./categories";
import { PrettyMenu } from "./PrettyMenu";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface LabelEditorProps {
  /** The labels this ingredient carries, in file order. */
  labels: string[];
  /** Every label in use anywhere, offered before typing a new one. */
  known: string[];
  colors: CategoryColors;
  onChange: (labels: string[]) => void;
  t: Translate;
}

/**
 * Labels edited as labels: a chip each with its cross, and a "+" that opens
 * the app's own menu — the labels this ingredient is missing, each with its
 * colour, and a last option to write a brand new one. The browser's native
 * suggestion list sat here before, and it looked like it.
 */
export function LabelEditor({ labels, known, colors, onChange, t }: LabelEditorProps) {
  const [open, setOpen] = useState(false);
  /** The new label being typed, once "new label" is picked. */
  const [draft, setDraft] = useState<string | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  const missing = known.filter((label) => !labels.includes(label));

  const add = (label: string) => {
    const clean = label.trim();
    if (clean && !labels.includes(clean)) onChange([...labels, clean]);
  };

  const commitNew = (value: string) => {
    add(value);
    setDraft(null);
  };

  return (
    <div className="nutrition-label-editor">
      {labels.map((label) => (
        <span
          className="nutrition-category-chip nutrition-category-chip--removable"
          style={categoryStyle(colors, label)}
          key={label}
        >
          {label}
          <button
            type="button"
            className="nutrition-chip-remove"
            aria-label={t("nutrition_meal_delete")}
            onClick={() => onChange(labels.filter((item) => item !== label))}
          >
            ✕
          </button>
        </span>
      ))}

      {draft === null ? (
        <button
          ref={addRef}
          type="button"
          className="nutrition-label-add"
          title={t("nutrition_label_add")}
          aria-label={t("nutrition_label_add")}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          +
        </button>
      ) : (
        <input
          className="entry-input nutrition-label-new"
          type="text"
          autoFocus
          value={draft}
          placeholder={t("nutrition_label_new")}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commitNew(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitNew(event.currentTarget.value);
            }
            if (event.key === "Escape") setDraft(null);
          }}
        />
      )}

      <PrettyMenu
        anchor={open && draft === null ? addRef.current : null}
        onClose={() => setOpen(false)}
        ariaLabel={t("nutrition_label_add")}
        minWidth={210}
        searchable
      >
        {(query) => {
          const needle = query.trim().toLowerCase();
          const visible = needle
            ? missing.filter((label) => label.toLowerCase().includes(needle))
            : missing;

          return (
            <>
              {visible.map((label) => (
                <button
                  key={label}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="pretty-select-menu__option"
                  onClick={() => {
                    add(label);
                    setOpen(false);
                  }}
                >
                  <span className="pretty-select__value">
                    <span
                      className="pretty-select__swatch"
                      style={{ ["--pretty-select-swatch" as string]: colors.get(label) }}
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </span>
                </button>
              ))}

              {/* Always on offer: what you searched and did not find is
                  exactly what a new label is for. */}
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="pretty-select-menu__option"
                onClick={() => {
                  setOpen(false);
                  setDraft(query.trim());
                }}
              >
                <span className="pretty-select__value">
                  <span>+ {t("nutrition_label_new")}</span>
                </span>
              </button>
            </>
          );
        }}
      </PrettyMenu>
    </div>
  );
}
