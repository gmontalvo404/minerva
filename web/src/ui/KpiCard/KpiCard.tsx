import type { ReactNode } from "react";

export interface KpiCardProps {
  label: string;
  value: string;
  meta?: string;
}

/** `article.kpi-card`, the same markup renderKpiCard produced. */
export function KpiCard({ label, value, meta }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{value}</p>
      {meta ? <span className="kpi-card__meta">{meta}</span> : null}
    </article>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="kpi-grid">{children}</div>;
}
