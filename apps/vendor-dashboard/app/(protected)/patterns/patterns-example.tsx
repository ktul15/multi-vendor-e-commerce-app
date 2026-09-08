"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { applyApiFieldErrors, parseTableUrlState, serializeTableUrlState } from "@repo/schemas";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Input,
  Select,
} from "@repo/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { exampleProductsQuery, patternTableOptions } from "./patterns-data";
import type { ExampleProduct } from "./patterns-data";

const productSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least two characters"),
  sku: z.string().trim().min(3, "SKU must contain at least three characters"),
});

type ProductFormValues = z.infer<typeof productSchema>;

function resolveUpdate<T>(updater: Updater<T>, current: T): T {
  return typeof updater === "function" ? (updater as (value: T) => T)(current) : updater;
}

export function PatternsExample() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(
    () => parseTableUrlState(new URLSearchParams(searchParams.toString()), patternTableOptions),
    [searchParams],
  );
  const [formError, setFormError] = useState<string>();
  const [savedMessage, setSavedMessage] = useState<string>();
  const [searchInput, setSearchInput] = useState(state.search);
  const productQuery = useQuery({
    ...exampleProductsQuery(state),
    placeholderData: keepPreviousData,
  });

  const writeState = useCallback(
    (nextState: typeof state) => {
      const query = serializeTableUrlState(nextState).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => setSearchInput(state.search), [state.search]);
  useEffect(() => {
    if (searchInput === state.search) return;
    const timer = window.setTimeout(
      () =>
        writeState({
          ...state,
          pagination: { ...state.pagination, pageIndex: 0 },
          search: searchInput,
        }),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput, state, writeState]);

  const columns = useMemo<ColumnDef<ExampleProduct>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            type="button"
          >
            Product name
          </button>
        ),
      },
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "status", header: "Status" },
    ],
    [],
  );

  // TanStack Table intentionally exposes instance methods the compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: productQuery.data?.rows ?? [],
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
      const columnFilters = resolveUpdate(updater, [...state.columnFilters]).flatMap((filter) =>
        typeof filter.value === "string" ? [{ id: filter.id, value: filter.value }] : [],
      );
      writeState({
        ...state,
        columnFilters,
        pagination: { ...state.pagination, pageIndex: 0 },
      });
    },
    onPaginationChange: (updater: Updater<PaginationState>) =>
      writeState({ ...state, pagination: resolveUpdate(updater, state.pagination) }),
    onSortingChange: (updater: Updater<SortingState>) =>
      writeState({
        ...state,
        pagination: { ...state.pagination, pageIndex: 0 },
        sorting: resolveUpdate(updater, [...state.sorting]),
      }),
    pageCount: productQuery.data?.pageCount ?? 0,
    state: {
      columnFilters: [...state.columnFilters],
      pagination: state.pagination,
      sorting: [...state.sorting],
    },
  });

  const form = useForm<ProductFormValues>({
    defaultValues: { name: "", sku: "" },
    resolver: zodResolver(productSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    setSavedMessage(undefined);
    await Promise.resolve();
    if (values.sku.toUpperCase() === "DUPLICATE") {
      setFormError(
        applyApiFieldErrors({
          error: {
            fieldErrors: [{ field: "sku", message: "SKU is already in use" }],
            message: "Validation failed",
          },
          fields: ["name", "sku"],
          setError: form.setError,
        }),
      );
      return;
    }
    setSavedMessage(`${values.name} is ready to save.`);
    form.reset();
  });

  return (
    <div className="ui-showcase">
      <header className="ui-showcase__header">
        <p>Web foundation example</p>
        <h1>Query, form, and URL table conventions</h1>
        <p>This non-business example documents the reusable patterns used by migrated features.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>URL-backed product table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="ui-showcase__grid">
            <Input
              label="Search products"
              onChange={(event) => setSearchInput(event.target.value)}
              value={searchInput}
            />
            <Select
              label="Status filter"
              onChange={(event) =>
                table.getColumn("status")?.setFilterValue(event.target.value || undefined)
              }
              value={state.columnFilters.find((filter) => filter.id === "status")?.value ?? ""}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
          {productQuery.isError ? (
            <p role="alert">Could not load example products.</p>
          ) : (
            <DataTable
              caption="Foundation example products"
              loading={productQuery.isPending}
              table={table}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>React Hook Form and Zod</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="ui-showcase__section" noValidate onSubmit={submit}>
            {formError ? <p role="alert">{formError}</p> : null}
            {savedMessage ? <p role="status">{savedMessage}</p> : null}
            <Input
              error={form.formState.errors.name?.message}
              label="Product name"
              {...form.register("name")}
            />
            <Input
              error={form.formState.errors.sku?.message}
              label="SKU"
              {...form.register("sku")}
            />
            <Button loading={form.formState.isSubmitting} loadingLabel="Validating" type="submit">
              Validate example
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
