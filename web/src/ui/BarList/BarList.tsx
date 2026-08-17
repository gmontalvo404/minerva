import styles from "./BarList.module.css";

export type BarTone = "category" | "positive" | "negative";

export interface BarItem {
  id: string;
  label: string;
  value: number;
  /** Formatted value shown on the right. */
  display: string;
  tone?: BarTone;
}

export interface BarListProps {
  items: ReadonlyArray<BarItem>;
  /** Defaults to the largest value in the list. */
  max?: number;
}

/** Horizontal bars: category distribution, free cash flow by month. */
export function BarList({ items, max }: BarListProps) {
  const ceiling = max ?? Math.max(1, ...items.map((item) => Math.abs(item.value)));

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const tone =
          item.tone === "positive" ? styles.positive : item.tone === "negative" ? styles.negative : undefined;
        const width = Math.min(100, (Math.abs(item.value) / ceiling) * 100);
        return (
          <div key={item.id} className={[styles.row, tone].filter(Boolean).join(" ")}>
            <div className={styles.head}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.value}>{item.display}</span>
            </div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
