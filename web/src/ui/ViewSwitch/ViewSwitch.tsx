export interface ViewSwitchOption<T extends string> {
  value: T;
  label: string;
  title?: string;
  disabled?: boolean;
}

export interface ViewSwitchProps<T extends string> {
  options: ReadonlyArray<ViewSwitchOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Extra class from the original stylesheet, e.g. "app-mode-switch". */
  variant?: string;
  /**
   * Data attribute each button carries, e.g. "dataset" renders
   * data-dataset="demo". styles.css keys some rules off these, like the amber
   * Demo button, so the switch has to emit them.
   */
  dataAttribute?: string;
  className?: string;
}

/**
 * `div.view-switch.view-switch--compact` with `button.view-button`, the
 * segmented control the whole dashboard uses.
 */
export function ViewSwitch<T extends string>({
  options,
  value,
  onChange,
  label,
  variant,
  dataAttribute,
  className,
}: ViewSwitchProps<T>) {
  return (
    <div
      className={["view-switch", "view-switch--compact", variant, className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`view-button${isActive ? " is-active" : ""}`}
            title={option.title}
            {...(dataAttribute ? { [`data-${dataAttribute}`]: option.value } : {})}
            aria-pressed={isActive}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
