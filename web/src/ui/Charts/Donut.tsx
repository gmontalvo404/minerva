export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  display: string;
}

export interface DonutProps {
  segments: ReadonlyArray<DonutSegment>;
  emptyTitle: string;
  emptyMessage: string;
  formatPercent: (ratio: number) => string;
}

/** The donut plus its legend, built with the same conic gradient as the original. */
export function Donut({ segments, emptyTitle, emptyMessage, formatPercent }: DonutProps) {
  const positive = segments.filter((segment) => segment.value > 0);

  if (positive.length === 0) {
    return (
      <div className="empty-state">
        <h3>{emptyTitle}</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const gradient = positive
    .map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 100;
      cursor = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="donut-layout">
      <div className="donut" style={{ ["--donut-background" as string]: `conic-gradient(${gradient})` }}>
        <div className="donut__hole" aria-hidden="true" />
      </div>
      <div className="legend-list">
        {segments.map((segment) => (
          <div className="legend-item" key={segment.key}>
            <span className="legend-item__swatch" style={{ background: segment.color }} />
            <div>
              <div className="legend-item__name">{segment.label}</div>
              <div className="legend-item__meta">
                {formatPercent(total > 0 ? (segment.value / total) * 100 : 0)}
              </div>
            </div>
            <strong>{segment.display}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
