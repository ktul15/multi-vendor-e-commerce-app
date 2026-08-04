"use client";

import { flexRender } from "@tanstack/react-table";
import type { Table } from "@tanstack/react-table";
import { Button } from "./button";

export type DataTableProps<TData> = Readonly<{
  caption: string;
  emptyMessage?: string;
  loading?: boolean;
  table: Table<TData>;
}>;

export function DataTable<TData>({
  caption,
  emptyMessage = "No results found.",
  loading = false,
  table,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const columnCount = Math.max(1, table.getVisibleLeafColumns().length);
  const { pageIndex } = table.getState().pagination;

  return (
    <div className="ui-data-table">
      <div className="ui-data-table__scroll">
        <table>
          <caption className="ui-visually-hidden">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                    key={header.id}
                    scope="col"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody aria-busy={loading || undefined}>
            {loading ? (
              <tr>
                <td colSpan={columnCount}>Loading results…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount}>{emptyMessage}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <nav aria-label={`${caption} pagination`} className="ui-data-table__pagination">
        <p aria-live="polite">Page {pageIndex + 1}</p>
        <div className="ui-data-table__pagination-actions">
          <Button
            disabled={!table.getCanPreviousPage() || loading}
            onClick={() => table.previousPage()}
            size="sm"
            type="button"
            variant="secondary"
          >
            Previous
          </Button>
          <Button
            disabled={!table.getCanNextPage() || loading}
            onClick={() => table.nextPage()}
            size="sm"
            type="button"
            variant="secondary"
          >
            Next
          </Button>
        </div>
      </nav>
    </div>
  );
}
