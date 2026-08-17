import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Optional dot before the label, for categories or types. */
  swatch?: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string> {
  options: ReadonlyArray<SelectOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  /** Accessible name. */
  label: string;
  placeholder?: string;
  /**
   * Shows the search box. The original only puts one on the category select,
   * so this is explicit instead of a count threshold.
   */
  searchable?: boolean;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /**
   * Modifier for the menu, e.g. "pretty-select-menu--category". The original
   * sizes the type, category and year menus differently through these.
   */
  menuVariant?: string;
  /**
   * Wrapper around the trigger. The sidebar picker sits inside `select-shell`,
   * but the table cells already provide `entry-type-shell` / `entry-select-shell`,
   * so pass null there to avoid a second box and a second arrow.
   */
  wrapperClassName?: string | null;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

/**
 * The dropdown of the app, rendering the `pretty-select` markup from
 * styles.css: the same trigger, the same floating menu with its search box and
 * the same selected state. The menu is fixed and portalled, like the original,
 * so it can escape panels with overflow.
 */
export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = "—",
  searchable = false,
  emptyMessage = "Sin resultados",
  disabled = false,
  id,
  className,
  wrapperClassName = "select-shell",
  menuVariant,
}: SelectProps<T>) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Resolved when the menu opens: there is no document while rendering on the server.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;
  const showSearch = searchable;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  useLayoutEffect(() => {
    if (!open) return;
    // A modal <dialog> paints in the top layer, so a menu appended to <body>
    // renders behind it and cannot be clicked. Hang it off the dialog instead.
    setHost(triggerRef.current?.closest("dialog") ?? document.body);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // openPrettySelect: the menu drops below the trigger unless it would run off
    // the bottom, in which case it flips above it.
    const menuHeight = Math.min(
      menuRef.current?.scrollHeight ?? 0,
      Math.floor(window.innerHeight * 0.42),
    );
    const belowTop = rect.bottom + 8;
    const aboveTop = Math.max(12, rect.top - menuHeight - 8);
    const top = belowTop + menuHeight > window.innerHeight - 12 ? aboveTop : belowTop;
    setPosition({ top, left: rect.left, width: rect.width });

    menuRef.current?.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
    // `host` is resolved by this same pass, so on the first one the menu is not
    // mounted yet and its height is unknown. Depending on it runs a second pass,
    // before paint, with the real height to measure against.
  }, [open, host]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    // Scrolling the long list of categories is scrolling *inside* the menu, and
    // it must not count as leaving it. Only the page moving under the menu does.
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  const menu =
    open && position && host
      ? createPortal(
          <div
            ref={menuRef}
            className={["pretty-select-menu", menuVariant].filter(Boolean).join(" ")}
            role="listbox"
            aria-labelledby={triggerId}
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            {showSearch ? (
              <div className="pretty-select-menu__search">
                <input
                  ref={searchRef}
                  className="pretty-select-menu__search-input"
                  type="search"
                  value={query}
                  placeholder="Buscar…"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            ) : null}

            <div className="pretty-select-menu__options">
              {visible.length === 0 ? (
                <p className="pretty-select-menu__empty">{emptyMessage}</p>
              ) : (
                visible.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={`pretty-select-menu__option${option.value === value ? " is-selected" : ""}`}
                    disabled={option.disabled}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="pretty-select__value">
                      {option.swatch ? (
                        <span
                          className="pretty-select__swatch"
                          style={{ ["--pretty-select-swatch" as string]: option.swatch }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span>{option.label}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>,
          host,
        )
      : null;

  const trigger = (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="pretty-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="pretty-select__value">
          {selected?.swatch ? (
            <span
              className="pretty-select__swatch"
              style={{ ["--pretty-select-swatch" as string]: selected.swatch }}
              aria-hidden="true"
            />
          ) : null}
          <span>{selected?.label ?? placeholder}</span>
        </span>
      </button>
      {menu}
    </>
  );

  if (!wrapperClassName) return trigger;
  return <div className={[wrapperClassName, className].filter(Boolean).join(" ")}>{trigger}</div>;
}
