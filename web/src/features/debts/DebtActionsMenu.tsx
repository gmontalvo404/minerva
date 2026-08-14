import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface DebtActionsMenuProps {
  /** The gear button that opened it, to anchor the menu. */
  anchor: HTMLElement | null;
  onClose: () => void;
  onView: () => void;
  onLinkCashFlow: () => void;
  t: Translate;
}

/**
 * `div.entry-actions-menu` for a debt row, the two items openDebtActionsMenu
 * builds: view the detail, or edit which cash flow row pays it.
 */
export function DebtActionsMenu({ anchor, onClose, onView, onLinkCashFlow, t }: DebtActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menu = menuRef.current;
    const width = menu?.offsetWidth ?? 220;
    const height = menu?.offsetHeight ?? 96;
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
      <button type="button" role="menuitem" className="entry-actions-menu__item" onClick={onView}>
        {t("debt_action_view")}
      </button>
      <button type="button" role="menuitem" className="entry-actions-menu__item" onClick={onLinkCashFlow}>
        {t("debt_action_link_cash_flow")}
      </button>
    </div>,
    document.body,
  );
}
