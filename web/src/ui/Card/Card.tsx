import type { ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps {
  /** Small uppercase line above the title. */
  eyebrow?: string;
  title?: string;
  /** Buttons or switches aligned to the right of the header. */
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}

/** The panel every section lives in: same padding, radius and shadow. */
export function Card({ eyebrow, title, actions, compact = false, className, children }: CardProps) {
  const hasHeader = Boolean(eyebrow || title || actions);

  return (
    <section
      className={[styles.card, compact ? styles.compact : undefined, className]
        .filter(Boolean)
        .join(" ")}
    >
      {hasHeader ? (
        <header className={styles.header}>
          <div className={styles.titles}>
            {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
            {title ? <h2 className={styles.title}>{title}</h2> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
