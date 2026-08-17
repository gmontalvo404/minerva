import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export interface PrettyMenuProps {
  /** The control the menu hangs from; null keeps the menu closed. */
  anchor: HTMLElement | null;
  onClose: () => void;
  ariaLabel: string;
  /** The menu never goes narrower than this, nor than the anchor. */
  minWidth?: number;
  /**
   * `pretty-select-menu__option` buttons, provided by the caller. With the
   * search box on, a function of the query — the caller filters its own
   * options and returns null when nothing matches, which shows the empty line.
   */
  children: ReactNode | ((query: string) => ReactNode);
  /** Shows the same search box the category select has. */
  searchable?: boolean;
  /** Same defaults as the Select component, which hardcodes them too. */
  searchPlaceholder?: string;
  emptyMessage?: string;
}

/**
 * The app's floating menu — the same `pretty-select-menu` the year and
 * category selects use — hung from whatever control needs one. The nutrition
 * pickers used native <select> menus before, and those are the operating
 * system's: unstylable, and nothing like the rest of the app.
 */
export function PrettyMenu({
  anchor,
  onClose,
  ariaLabel,
  minWidth = 230,
  children,
  searchable = false,
  searchPlaceholder = "Buscar…",
  emptyMessage = "Sin resultados",
}: PrettyMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [query, setQuery] = useState("");

  // The next opening starts with everything visible again.
  useEffect(() => {
    if (!anchor) setQuery("");
  }, [anchor]);

  useLayoutEffect(() => {
    if (!anchor) {
      setPosition(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();

    // Triggers here are small pills and cells: the menu takes the room its
    // options need and clamps to the viewport instead of matching the anchor.
    const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);

    // openPrettySelect: below the trigger unless it would run off the bottom.
    const menuHeight = Math.min(menuRef.current?.scrollHeight ?? 0, Math.floor(window.innerHeight * 0.42));
    const belowTop = rect.bottom + 8;
    const aboveTop = Math.max(12, rect.top - menuHeight - 8);
    const top = belowTop + menuHeight > window.innerHeight - 12 ? aboveTop : belowTop;

    setPosition({ top, left, width });
  }, [anchor, minWidth]);

  useEffect(() => {
    if (!anchor) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !anchor.contains(target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const close = () => onClose();
    // Scrolling inside the menu is not leaving it; the page moving under it is.
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
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
  }, [anchor, onClose]);

  if (!anchor) return null;

  const content = typeof children === "function" ? children(query) : children;

  return createPortal(
    <div
      ref={menuRef}
      className="pretty-select-menu pretty-select-menu--nutrition"
      role="listbox"
      aria-label={ariaLabel}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width: position?.width,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {searchable ? (
        <div className="pretty-select-menu__search">
          <input
            className="pretty-select-menu__search-input"
            type="search"
            autoFocus
            value={query}
            placeholder={searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}

      <div className="pretty-select-menu__options">
        {content ?? <p className="pretty-select-menu__empty">{emptyMessage}</p>}
      </div>
    </div>,
    // A modal <dialog> paints in the top layer, so a menu on <body> would
    // render behind it. None of these pickers live in one today; still cheap.
    anchor.closest("dialog") ?? document.body,
  );
}
