/** The sun/cloud switch from the original header, markup included. */
export function ThemeToggle({
  theme,
  onChange,
  label,
}: {
  theme: "light" | "dark";
  onChange: (theme: "light" | "dark") => void;
  label: string;
}) {
  return (
    <button
      className={`theme-toggle${theme === "dark" ? " is-dark" : ""}`}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={theme === "dark"}
      onClick={() => onChange(theme === "dark" ? "light" : "dark")}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__sun-glow" />
        <span className="theme-toggle__band theme-toggle__band--1" />
        <span className="theme-toggle__band theme-toggle__band--2" />
        <span className="theme-toggle__cloud theme-toggle__cloud--small" />
        <span className="theme-toggle__cloud theme-toggle__cloud--large" />
        <span className="theme-toggle__star theme-toggle__star--1" />
        <span className="theme-toggle__star theme-toggle__star--2" />
        <span className="theme-toggle__star theme-toggle__star--3" />
        <span className="theme-toggle__star theme-toggle__star--4" />
        <span className="theme-toggle__thumb" />
      </span>
      <span className="visually-hidden">{label}</span>
    </button>
  );
}
