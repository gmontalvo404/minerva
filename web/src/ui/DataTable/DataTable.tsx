import type { ReactNode } from "react";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  width?: string;
  /** Extra class for the cells, from the original stylesheet. */
  cellClassName?: string;
  /** Extra class for the header cell. Fixed-width columns need it there too. */
  headerClassName?: string;
  render: (row: Row, index: number) => ReactNode;
}

export interface DataTableProps<Row> {
  columns: ReadonlyArray<Column<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row, index: number) => string;
  empty?: ReactNode;
  rowProps?: (row: Row, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  /** Modifier class, e.g. "data-table--nutrition". */
  variant?: string;
  caption?: string;
}

/**
 * `table.data-table` inside its scroller, exactly like the original tables.
 *
 * Alignment is never set here: styles.css left-aligns every cell and right-aligns
 * the ones that need it through classes like entry-cell--amount or the
 * data-table--annual variant. Setting it inline would break that agreement.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  rowProps,
  variant,
  caption,
}: DataTableProps<Row>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="table-scroll">
      <table className={["data-table", variant].filter(Boolean).join(" ")}>
        {caption ? <caption className="visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.headerClassName}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} {...rowProps?.(row, index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.cellClassName}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
