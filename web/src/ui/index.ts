/**
 * The design system.
 *
 * These components render the markup and class names of the original
 * dashboard's styles.css, which is imported whole in main.tsx. That is what
 * makes the React version look identical: nothing here reinvents the design,
 * it reuses it.
 *
 * Rule of thumb: if you are about to write CSS with colors, borders or radii in
 * a feature folder, the piece belongs here instead.
 */
export { Button } from "./Button/Button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./Button/Button";

export { ViewSwitch } from "./ViewSwitch/ViewSwitch";
export type { ViewSwitchOption, ViewSwitchProps } from "./ViewSwitch/ViewSwitch";

export { MonthNav } from "./MonthNav/MonthNav";
export type { MonthNavOption } from "./MonthNav/MonthNav";

export { Select } from "./Select/Select";
export type { SelectOption, SelectProps } from "./Select/Select";

export { Panel, CardPanel } from "./Panel/Panel";
export type { PanelProps, CardPanelProps } from "./Panel/Panel";

export { KpiCard, KpiGrid } from "./KpiCard/KpiCard";
export type { KpiCardProps } from "./KpiCard/KpiCard";

export { DataTable } from "./DataTable/DataTable";
export type { Column, DataTableProps } from "./DataTable/DataTable";

export { FreeBars } from "./Charts/FreeBars";
export type { FreeBarsItem } from "./Charts/FreeBars";

export { Donut } from "./Charts/Donut";
export type { DonutProps, DonutSegment } from "./Charts/Donut";

export { ThemeToggle } from "./ThemeToggle/ThemeToggle";

export { Tag, TagList } from "./Tag/Tag";
export type { TagProps } from "./Tag/Tag";

export { Toggle } from "./Toggle/Toggle";

export { EmptyState } from "./EmptyState/EmptyState";
export type { EmptyStateProps } from "./EmptyState/EmptyState";

export { Dialog } from "./Dialog/Dialog";
export type { DialogProps } from "./Dialog/Dialog";

export { Field, FieldRow, TextField, TextInput } from "./Field/Field";
export type { FieldProps, TextInputProps } from "./Field/Field";

export { BarList } from "./BarList/BarList";
export type { BarItem, BarListProps, BarTone } from "./BarList/BarList";

export { Progress } from "./Progress/Progress";
export type { ProgressProps } from "./Progress/Progress";
