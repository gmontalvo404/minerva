import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import styles from "./Field.module.css";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** Label, hint and error around any control, so forms line up everywhere. */
export function Field({ label, hint, error, htmlFor, children, className }: FieldProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <span className={styles.hint}>{hint}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  numeric?: boolean;
}

export function TextInput({ numeric = false, className, ...rest }: TextInputProps) {
  return (
    <input
      className={[styles.input, numeric ? styles.numeric : undefined, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

/** A labelled input in one call, the common case. */
export function TextField({
  label,
  hint,
  error,
  className,
  ...input
}: FieldProps extends never ? never : Omit<FieldProps, "children" | "htmlFor"> & TextInputProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <TextInput id={id} {...input} />
    </Field>
  );
}

/** Lays out several fields on one line. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
