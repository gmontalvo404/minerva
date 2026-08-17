import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface EntryActionsMenuProps {
  /** The button that opened it, to anchor the menu. */
  anchor: HTMLElement | null;
  onClose: () => void;
  /** Auto-generated entries can only be inspected, not changed. */
  isAuto: boolean;
  /** The debt link item only shows on debts entries, like in the original. */
  isDebtEntry: boolean;
  t: Translate;
  onDuplicate: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onLinkDebt: () => void;
}

/**
 * `div.entry-actions-menu` portalled to the body and positioned under its
 * button, the same menu openEntryActionsMenu builds: duplicate, delete, history,
 * plus the debt link on debts entries.
 */
export function EntryActionsMenu({
  anchor,
  onClose,
  isAuto,
  isDebtEntry,
  t,
  onDuplicate,
  onDelete,
  onHistory,
  onLinkDebt,
}: EntryActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menu = menuRef.current;
    const width = menu?.offsetWidth ?? 220;
    const height = menu?.offsetHeight ?? 160;
    const padding = 12;

    // Same clamping as positionEntryActionsMenu: keep it inside the viewport.
    const left = Math.min(Math.max(padding, rect.left), window.innerWidth - width - padding);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - padding ? rect.top - height - 6 : below;

    setPosition({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !anchor?.contains(target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [anchor, onClose]);

  if (!anchor) return null;

  const lockedTitle = isAuto ? t("entry_auto_locked_hint") : undefined;

  return createPortal(
    <div
      ref={menuRef}
      className="entry-actions-menu"
      role="menu"
      style={{
        position: "fixed",
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {isDebtEntry && !isAuto ? (
        <button type="button" role="menuitem" className="entry-actions-menu__item" onClick={onLinkDebt}>
          {t("entry_action_link_debt")}
        </button>
      ) : null}

      <button
        type="button"
        role="menuitem"
        className="entry-actions-menu__item"
        disabled={isAuto}
        aria-disabled={isAuto}
        title={lockedTitle}
        onClick={onDuplicate}
      >
        {t("entry_action_duplicate")}
      </button>

      <button
        type="button"
        role="menuitem"
        className="entry-actions-menu__item entry-actions-menu__item--danger"
        disabled={isAuto}
        aria-disabled={isAuto}
        title={lockedTitle}
        onClick={onDelete}
      >
        {t("entry_action_delete")}
      </button>

      <button type="button" role="menuitem" className="entry-actions-menu__item" onClick={onHistory}>
        {t("entry_action_history")}
      </button>
    </div>,
    document.body,
  );
}
