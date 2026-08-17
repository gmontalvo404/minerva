import { useRef, useState } from "react";
import { PrettyMenu } from "./PrettyMenu";

export interface CategoryPickerOption {
  id: string;
  name: string;
}

export interface CategoryPickerProps {
  /** The label on the pill. */
  label: string;
  /** The count beside it, already formatted ("13" or "2/10"). */
  count: string;
  /** Sets --nutrition-category-color for the pill and its dot. */
  style?: React.CSSProperties;
  /** "" | " is-partial" | " is-empty", the pill states of styles.css. */
  state: string;
  options: CategoryPickerOption[];
  onPick: (id: string) => void;
  /** Accessible name of the list, e.g. the exclude hint. */
  menuLabel: string;
}

/** The category pill, opening the app's own menu instead of the system one. */
export function CategoryPicker({ label, count, style, state, options, onPick, menuLabel }: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`nutrition-category-picker${state}`}
        style={style}
        disabled={!options.length}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <span className="nutrition-category-picker__count">{count}</span>
      </button>

      <PrettyMenu
        anchor={open ? triggerRef.current : null}
        onClose={() => setOpen(false)}
        ariaLabel={`${menuLabel} · ${label}`}
        searchable
      >
        {(query) => {
          const needle = query.trim().toLowerCase();
          const visible = needle
            ? options.filter((option) => option.name.toLowerCase().includes(needle))
            : options;
          if (!visible.length) return null;

          return visible.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={false}
              className="pretty-select-menu__option"
              onClick={() => {
                onPick(option.id);
                setOpen(false);
              }}
            >
              <span className="pretty-select__value">
                <span>{option.name}</span>
              </span>
            </button>
          ));
        }}
      </PrettyMenu>
    </>
  );
}
