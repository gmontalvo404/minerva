/** `label.entry-active-toggle`, the pill switch of the tables. */
export function Toggle({
  checked,
  onChange,
  label,
  hideLabel = false,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="entry-active-toggle">
      <input
        className="entry-active-toggle__input"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="entry-active-toggle__ui" aria-hidden="true" />
      <span className={hideLabel ? "visually-hidden" : undefined}>{label}</span>
    </label>
  );
}
