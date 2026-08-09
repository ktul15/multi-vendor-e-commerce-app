import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CategorySelector } from "../app/category-selector";
import type { Category } from "../src/lib/product-data";

const categories: Category[] = [
  {
    children: [
      {
        children: [],
        id: "22222222-2222-4222-8222-222222222222",
        name: "Extra long noise-cancelling wireless headphones and accessories",
      },
      {
        children: [],
        id: "33333333-3333-4333-8333-333333333333",
        name: "Disabled category",
      },
    ],
    id: "11111111-1111-4111-8111-111111111111",
    name: "Electronics",
  },
];

function ControlledSelector({ initialValue = "" }: Readonly<{ initialValue?: string }>) {
  const [value, setValue] = useState(initialValue);
  return (
    <CategorySelector
      categories={categories}
      disabledIds={new Set(["33333333-3333-4333-8333-333333333333"])}
      onChange={setValue}
      value={value}
    />
  );
}

describe("hierarchical category selector", () => {
  it("searches readable full paths and selects with the keyboard", () => {
    render(<ControlledSelector />);
    const combobox = screen.getByRole("combobox", { name: /Category/ });

    fireEvent.change(combobox, { target: { value: "wireless headphones" } });
    const child = screen.getByRole("option", {
      name: /Electronics \/ Extra long noise-cancelling wireless headphones and accessories/,
    });
    expect(screen.getByRole("listbox", { name: "Category options" })).toBeVisible();
    expect(child).toHaveStyle({ "--category-depth": "1" });

    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });
    expect(combobox).toHaveValue(
      "Electronics / Extra long noise-cancelling wireless headphones and accessories",
    );
  });

  it("identifies groups, preserves edit selections, and rejects disabled options", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CategorySelector
        categories={categories}
        disabledIds={new Set(["33333333-3333-4333-8333-333333333333"])}
        onChange={onChange}
        value="11111111-1111-4111-8111-111111111111"
      />,
    );
    const combobox = screen.getByRole("combobox", { name: /Category/ });
    expect(combobox).toHaveValue("Electronics");
    fireEvent.focus(combobox);
    expect(screen.getByText("Group")).toBeVisible();

    fireEvent.click(
      screen.getByRole("option", { name: /Electronics \/ Disabled category, unavailable/ }),
    );
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <CategorySelector
        categories={categories}
        disabledIds={new Set(["33333333-3333-4333-8333-333333333333"])}
        onChange={onChange}
        value="33333333-3333-4333-8333-333333333333"
      />,
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(""));

    rerender(<ControlledSelector initialValue="22222222-2222-4222-8222-222222222222" />);
    expect(screen.getByRole("combobox", { name: /Category/ })).toHaveValue(
      "Electronics / Extra long noise-cancelling wireless headphones and accessories",
    );
  });
});
