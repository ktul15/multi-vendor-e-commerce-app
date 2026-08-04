import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../src";

type Row = { id: string; name: string };

function TableExample({
  data = [{ id: "1", name: "Cotton shirt" }],
  loading = false,
  onPageChange = vi.fn(),
  pageCount = 2,
}: Readonly<{
  data?: Row[];
  loading?: boolean;
  onPageChange?: () => void;
  pageCount?: number;
}>) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 1 });
  const [sorting, setSorting] = useState<import("@tanstack/react-table").SortingState>([]);
  // TanStack Table intentionally exposes instance methods the compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<Row>({
    columns: [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting()} type="button">
            Name
          </button>
        ),
      },
    ],
    data,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      setPagination(updater);
      onPageChange();
    },
    onSortingChange: setSorting,
    pageCount,
    state: { pagination, sorting },
  });
  return <DataTable caption="Products" loading={loading} table={table} />;
}

describe("DataTable", () => {
  it("renders semantic table content and controlled pagination", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<TableExample onPageChange={onPageChange} />);

    expect(screen.getByRole("table", { name: "Products" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Cotton shirt" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledOnce();
    expect(screen.getByText("Page 2")).toBeVisible();
  });

  it("announces loading without removing the table headers", () => {
    render(<TableExample loading />);
    expect(screen.getByText("Loading results…")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("announces sorting state on the affected column", async () => {
    const user = userEvent.setup();
    render(<TableExample />);

    const header = screen.getByRole("columnheader", { name: "Name" });
    expect(header).not.toHaveAttribute("aria-sort");
    await user.click(screen.getByRole("button", { name: "Name" }));
    expect(header).toHaveAttribute("aria-sort", "ascending");
  });

  it("renders the empty state with disabled pagination boundaries", () => {
    render(<TableExample data={[]} pageCount={1} />);

    expect(screen.getByText("No results found.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
