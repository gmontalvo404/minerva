import { useRef, useState } from "react";
import { PrettyMenu } from "./PrettyMenu";

export interface MealPickerOption {
  id: string;
  name: string;
}

export interface MealPickerProps {
  /** The meal currently on the slot, or "" for none. */
  value: string;
  /** What the closed cell reads; the none label when empty. */
  display: string;
  isEmpty: boolean;
  options: MealPickerOption[];
  noneLabel: string;
  onChange: (id: string) => void;
  /** Accessible name: the day and the slot. */
  label: string;
}

/**
 * One slot of the week — the same `nutrition-plan-picker` cell, opening the
 * app's own menu with the meals of that type instead of the system list the
 * old invisible <select> popped.
 */
export function MealPicker({ value, display, isEmpty, options, noneLabel, onChange, label }: MealPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="nutrition-plan-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`nutrition-plan-picker__label${isEmpty ? " is-empty" : ""}`}>{display}</span>
      </button>

      <PrettyMenu
        anchor={open ? triggerRef.current : null}
        onClose={() => setOpen(false)}
        ariaLabel={label}
        searchable
      >
        {(query) => {
          const needle = query.trim().toLowerCase();
          // The none row clears the slot: it stays put while you search.
          const visible = needle
            ? options.filter((option) => option.name.toLowerCase().includes(needle))
            : options;

          return (
            <>
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                className={`pretty-select-menu__option${value === "" ? " is-selected" : ""}`}
                onClick={() => pick("")}
              >
                <span className="pretty-select__value">
                  <span>{noneLabel}</span>
                </span>
              </button>

              {visible.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  className={`pretty-select-menu__option${option.id === value ? " is-selected" : ""}`}
                  onClick={() => pick(option.id)}
                >
                  <span className="pretty-select__value">
                    <span>{option.name}</span>
                  </span>
                </button>
              ))}
            </>
          );
        }}
      </PrettyMenu>
    </>
  );
}
