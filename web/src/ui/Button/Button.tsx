import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";
export type ButtonSize = "medium" | "small";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

/**
 * Buttons use the classes styles.css already defines: the dark pill of
 * "Add income" for the primary action, the round icon button for the rest.
 */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: "month-button",
  primary: "add-entry-button",
  ghost: "entry-actions-button",
  danger: "entry-delete-button",
};

export function Button({
  variant = "default",
  size = "medium",
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[VARIANT_CLASS[variant], size === "small" ? "is-small" : undefined, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
