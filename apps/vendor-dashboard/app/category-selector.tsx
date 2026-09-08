"use client";

import { useEffect, useId, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent } from "react";
import type { Category } from "../src/lib/product-data";

const EMPTY_DISABLED_IDS: ReadonlySet<string> = new Set();

export type CategoryOption = Readonly<{
  depth: number;
  hasChildren: boolean;
  id: string;
  name: string;
  path: string;
}>;

export function flattenCategoryOptions(
  categories: readonly Category[],
  parents: readonly string[] = [],
): CategoryOption[] {
  return categories.flatMap((category) => {
    const names = [...parents, category.name];
    return [
      {
        depth: parents.length,
        hasChildren: category.children.length > 0,
        id: category.id,
        name: category.name,
        path: names.join(" / "),
      },
      ...flattenCategoryOptions(category.children, names),
    ];
  });
}

function nextEnabled(
  options: readonly CategoryOption[],
  disabledIds: ReadonlySet<string>,
  current: number,
  direction: 1 | -1,
) {
  if (options.length === 0) return -1;
  const startingIndex = current < 0 ? (direction === 1 ? -1 : 0) : current;
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (startingIndex + direction * offset + options.length) % options.length;
    if (!disabledIds.has(options[index]!.id)) return index;
  }
  return -1;
}

export function CategorySelector({
  categories,
  disabledIds = EMPTY_DISABLED_IDS,
  error,
  onChange,
  value,
}: Readonly<{
  categories: readonly Category[];
  disabledIds?: ReadonlySet<string>;
  error?: string;
  onChange: (id: string) => void;
  value: string;
}>) {
  const id = useId();
  const options = flattenCategoryOptions(categories);
  const selected = options.find((option) => option.id === value && !disabledIds.has(option.id));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string>();
  const [activeIndex, setActiveIndex] = useState(-1);
  const search = query ?? selected?.path ?? "";
  const normalized = search.trim().toLocaleLowerCase();
  const filtered =
    query === undefined || normalized.length === 0
      ? options
      : options.filter((option) => option.path.toLocaleLowerCase().includes(normalized));
  const activeOption = activeIndex >= 0 ? filtered[activeIndex] : undefined;

  useEffect(() => {
    if (value && disabledIds.has(value)) onChange("");
  }, [disabledIds, onChange, value]);

  useEffect(() => {
    if (!activeOption) return;
    document
      .getElementById(`${id}-option-${activeOption.id}`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [activeOption, id]);

  const choose = (option: CategoryOption) => {
    if (disabledIds.has(option.id)) return;
    onChange(option.id);
    setQuery(undefined);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery(undefined);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        nextEnabled(filtered, disabledIds, current, event.key === "ArrowDown" ? 1 : -1),
      );
      return;
    }
    if (event.key === "Enter" && open && activeOption) {
      event.preventDefault();
      choose(activeOption);
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setOpen(false);
    setQuery(undefined);
  };

  return (
    <div className="vendor-category-selector" onBlur={onBlur}>
      <label className="ui-field__label" htmlFor={`${id}-search`}>
        Category <span aria-hidden="true">*</span>
      </label>
      <input
        aria-activedescendant={activeOption ? `${id}-option-${activeOption.id}` : undefined}
        aria-autocomplete="list"
        aria-controls={`${id}-options`}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-required="true"
        autoComplete="off"
        className="ui-field__control"
        id={`${id}-search`}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
          setActiveIndex(-1);
        }}
        onClick={() => setOpen(true)}
        onFocus={(event) => {
          setOpen(true);
          event.currentTarget.select();
        }}
        onKeyDown={onKeyDown}
        placeholder="Search categories"
        role="combobox"
        value={search}
      />
      <p
        className={`ui-field__message${error ? " ui-field__message--error" : ""}`}
        id={error ? `${id}-error` : `${id}-hint`}
      >
        {error ?? "Search by category name or its full path."}
      </p>
      {open ? (
        <div
          aria-label="Category options"
          className="vendor-category-selector__options"
          id={`${id}-options`}
          role="listbox"
        >
          {filtered.length === 0 ? (
            <p className="vendor-category-selector__empty" role="status">
              No categories match your search.
            </p>
          ) : (
            filtered.map((option, index) => {
              const disabled = disabledIds.has(option.id);
              return (
                <button
                  aria-disabled={disabled}
                  aria-label={`${option.path}${option.hasChildren ? ", group" : ""}${disabled ? ", unavailable" : ""}`}
                  aria-selected={option.id === value}
                  className="vendor-category-selector__option"
                  data-active={index === activeIndex || undefined}
                  id={`${id}-option-${option.id}`}
                  key={option.id}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  style={{ "--category-depth": option.depth } as CSSProperties}
                  tabIndex={-1}
                  type="button"
                >
                  <span aria-hidden="true" className="vendor-category-selector__icon">
                    {option.hasChildren ? "▣" : "◇"}
                  </span>
                  <span className="vendor-category-selector__copy">
                    <strong>{option.name}</strong>
                    <small>{option.path}</small>
                  </span>
                  {option.hasChildren ? (
                    <span className="vendor-category-selector__group">Group</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
