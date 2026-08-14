import type { ReactNode } from "react";
import styles from "./Tag.module.css";

export interface TagProps {
  children: ReactNode;
  /** When given, the tag shows a remove button. */
  onRemove?: () => void;
  removeLabel?: string;
}

/** A removable chip: excluded ingredients, linked debts, active filters. */
export function Tag({ children, onRemove, removeLabel = "Quitar" }: TagProps) {
  return (
    <span className={styles.tag}>
      {children}
      {onRemove ? (
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={removeLabel}>
          ✕
        </button>
      ) : null}
    </span>
  );
}

/** Wraps a set of tags with consistent spacing. */
export function TagList({ children }: { children: ReactNode }) {
  return <div className={styles.list}>{children}</div>;
}
