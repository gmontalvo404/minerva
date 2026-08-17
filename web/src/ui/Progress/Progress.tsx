import styles from "./Progress.module.css";

export interface ProgressProps {
  /** 0 to 100. */
  value: number;
  display?: string;
}

/** A thin progress bar with its percentage, used in the debts table. */
export function Progress({ value, display }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${clamped}%` }} />
      </div>
      <span className={styles.value}>{display ?? `${clamped.toFixed(0)}%`}</span>
    </div>
  );
}
