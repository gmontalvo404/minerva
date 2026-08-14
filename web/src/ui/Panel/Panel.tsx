import type { ReactNode } from "react";

/**
 * The page panel: `section.panel` with its section head. Markup and classes are
 * the ones in styles.css, so it renders exactly like the original dashboard.
 */
export interface PanelProps {
  eyebrow?: string;
  title?: ReactNode;
  note?: ReactNode;
  id?: string;
  children: ReactNode;
}

export function Panel({ eyebrow, title, note, id, children }: PanelProps) {
  const hasHead = Boolean(eyebrow || title || note);
  return (
    <section className="panel" id={id}>
      {hasHead ? (
        <div className="section-head">
          <div>
            {eyebrow ? <p className="section-head__eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {note ? <p className="section-head__note">{note}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** `article.card` with its head, the box the panels are built from. */
export interface CardPanelProps {
  eyebrow?: string;
  title?: ReactNode;
  actions?: ReactNode;
  /** Uses card__head--detail, the head variant with the action button. */
  detailHead?: boolean;
  /** The card__note--detail line under the head. */
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function CardPanel({
  eyebrow,
  title,
  actions,
  detailHead = false,
  note,
  className,
  children,
}: CardPanelProps) {
  const hasHead = Boolean(eyebrow || title || actions);
  return (
    <article className={["card", className].filter(Boolean).join(" ")}>
      {hasHead ? (
        <div className={detailHead ? "card__head card__head--detail" : "card__head"}>
          <div>
            {eyebrow ? <p className="card__eyebrow">{eyebrow}</p> : null}
            {title ? <h3>{title}</h3> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {note ? <p className="card__note card__note--detail">{note}</p> : null}
      {children}
    </article>
  );
}
