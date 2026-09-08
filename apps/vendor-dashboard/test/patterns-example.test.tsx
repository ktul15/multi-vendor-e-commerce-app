import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PatternsExample } from "../app/(protected)/patterns/patterns-example";
import { canonicalizePatternSearchParams } from "../app/(protected)/patterns/patterns-data";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/patterns",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.searchParams,
}));

describe("foundation patterns example", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.searchParams = new URLSearchParams();
  });

  it("loads query data and writes controlled table pagination to the URL", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatternsExample />);

    expect(await screen.findByRole("cell", { name: "Cotton shirt" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("page=2"), {
      scroll: false,
    });
  });

  it("writes sorting and filtering to the URL and resets the page", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatternsExample />);
    await screen.findByRole("cell", { name: "Cotton shirt" });

    await user.click(screen.getByRole("button", { name: "Product name" }));
    expect(navigation.replace).toHaveBeenLastCalledWith(
      expect.stringMatching(/direction=asc.*page=1.*sort=name/),
      { scroll: false },
    );

    navigation.replace.mockClear();
    await user.selectOptions(screen.getByRole("combobox", { name: "Status filter" }), "draft");
    expect(navigation.replace).toHaveBeenCalledWith(
      expect.stringMatching(/filter\.status=draft.*page=1/),
      { scroll: false },
    );
  });

  it("debounces search before replacing the URL", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatternsExample />);

    await user.type(screen.getByRole("textbox", { name: "Search products" }), "cot");
    expect(navigation.replace).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("search=cot"), {
        scroll: false,
      }),
    );
  });

  it("canonicalizes hostile and unsupported server search parameters", () => {
    const result = canonicalizePatternSearchParams({
      extra: "discard-me",
      "filter.status": "x".repeat(40),
      page: "-2",
      pageSize: "999",
      search: "x".repeat(101),
      sort: "password",
    });

    expect(result.shouldRedirect).toBe(true);
    expect(result.canonicalQuery).toBe("page=1&pageSize=2");
    expect(result.state.pagination).toEqual({ pageIndex: 0, pageSize: 2 });
  });

  it("surfaces Zod and API field errors without losing the form message", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PatternsExample />);

    await user.click(screen.getByRole("button", { name: "Validate example" }));
    expect(await screen.findByText("Name must contain at least two characters")).toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Product name" }), "Example product");
    await user.type(screen.getByRole("textbox", { name: "SKU" }), "DUPLICATE");
    await user.click(screen.getByRole("button", { name: "Validate example" }));

    expect(await screen.findByText("SKU is already in use")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Validation failed");
  });
});
