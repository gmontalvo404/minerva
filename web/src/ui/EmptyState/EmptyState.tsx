import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

/** `div.empty-state`, the same block the original shows in empty tables. */
export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  );
}
