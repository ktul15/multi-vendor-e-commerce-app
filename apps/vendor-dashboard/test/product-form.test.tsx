import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "../app/product-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("product form navigation protection", () => {
  it("blocks internal links and browser history while changes are unsaved", async () => {
    render(
      <>
        <a href="/orders">Orders</a>
        <ProductForm categories={[]} />
      </>,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Changed" } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await waitFor(() => expect(screen.getByLabelText(/Name/)).toHaveValue("Changed"));
    const clickAllowed = screen
      .getByRole("link", { name: "Orders" })
      .dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0, cancelable: true }));

    expect(clickAllowed).toBe(false);
    expect(confirm).toHaveBeenCalledWith("Discard your unsaved product changes?");

    const pushState = vi.spyOn(window.history, "pushState");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(pushState).toHaveBeenCalledWith(null, "", window.location.href);
  });
});
