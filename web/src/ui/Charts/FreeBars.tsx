export interface FreeBarsItem {
  key: string;
  label: string;
  value: number;
  display: string;
}

/**
 * The bar chart of available money per month. Same geometry as the original:
 * the axis sits where it needs to depending on whether there are negatives, and
 * bars scale against the largest value on their side.
 */
export function FreeBars({ items }: { items: ReadonlyArray<FreeBarsItem> }) {
  const positives = items.map((item) => item.value).filter((value) => value > 0);
  const negatives = items.map((item) => Math.abs(item.value)).filter((_, index) => (items[index]?.value ?? 0) < 0);
  const hasPositive = positives.length > 0;
  const hasNegative = negatives.length > 0;
  const maxPositive = Math.max(...positives, 1);
  const maxNegative = Math.max(...negatives, 1);
  const axisPosition = hasPositive && !hasNegative ? 100 : !hasPositive && hasNegative ? 0 : 50;

  return (
    <div className="free-bars" style={{ ["--free-axis-position" as string]: `${axisPosition}%` }}>
      {items.map((item) => {
        const isPositive = item.value >= 0;
        const scale = hasPositive && hasNegative ? 44 : 88;
        const height = (Math.abs(item.value) / (isPositive ? maxPositive : maxNegative)) * scale;
        return (
          <div className="free-bars__column" key={item.key}>
            <div className="free-bars__frame">
              <div className="free-bars__axis" />
              <div
                className={`free-bars__bar ${isPositive ? "is-positive" : "is-negative"}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <div className="free-bars__label">{item.label}</div>
            <div className="free-bars__value">{item.display}</div>
          </div>
        );
      })}
    </div>
  );
}
