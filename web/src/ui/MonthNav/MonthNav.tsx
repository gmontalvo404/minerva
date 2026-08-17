export interface MonthNavOption<T extends string> {
  value: T;
  label: string;
}

export interface MonthNavProps<T extends string> {
  options: ReadonlyArray<MonthNavOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  /** Wrapper class; pass null to render the buttons with no wrapper at all. */
  wrapperClassName?: string | null;
  /** Extra class per button, e.g. control-sidebar__annual-button. */
  buttonClassName?: string;
}

/**
 * The stacked `button.month-button` list of the sidebar. In the original the
 * month buttons carry only `month-button`, while the debt and meal-plan ones
 * also carry `control-sidebar__annual-button`, so the class is a parameter.
 */
export function MonthNav<T extends string>({
  options,
  value,
  onChange,
  wrapperClassName = "month-nav month-nav--sidebar",
  buttonClassName,
}: MonthNavProps<T>) {
  const buttons = options.map((option) => (
    <button
      key={option.value}
      type="button"
      className={["month-button", buttonClassName, option.value === value ? "is-active" : undefined]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onChange(option.value)}
    >
      {option.label}
    </button>
  ));

  if (!wrapperClassName) return <>{buttons}</>;
  return <div className={wrapperClassName}>{buttons}</div>;
}
