import { renderWithProviders } from "@repo/test-utils";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductActions } from "../app/product-actions";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
  document.cookie = "vendor_csrf_token=csrf-token; path=/";
});

describe("product actions", () => {
  it("requires explicit confirmation and refreshes after a permitted delete", async () => {
    const fetch = vi.fn(async () => Response.json({ message: "deleted", success: true }));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(
      <ProductActions id="11111111-1111-4111-8111-111111111111" name="Studio Headset" />,
    );

    await user.click(screen.getByRole("button", { name: "Delete Studio Headset" }));
    expect(screen.getByText(/Products with order history cannot be deleted/)).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete product" }));

    expect(fetch).toHaveBeenCalledWith("/api/products/11111111-1111-4111-8111-111111111111", {
      headers: { "X-CSRF-Token": "csrf-token" },
      method: "DELETE",
    });
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("keeps the confirmation open and surfaces permission conflicts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { message: "Product cannot be deleted because it has order history", success: false },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(
      <ProductActions id="11111111-1111-4111-8111-111111111111" name="Studio Headset" />,
    );

    await user.click(screen.getByRole("button", { name: "Delete Studio Headset" }));
    await user.click(screen.getByRole("button", { name: "Delete product" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("order history");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
});
