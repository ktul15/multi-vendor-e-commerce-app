import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPromosView, promoLifecycle } from "../app/admin-promos-view";
import { PromoForm } from "../app/promo-form";
import type { AdminPromo, AdminPromoDetail } from "../src/lib/promo-data";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
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
  navigation.push.mockReset();
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
  document.cookie = "admin_csrf_token=csrf-token; path=/";
});

const promoId = "11111111-1111-4111-8111-111111111111";
function promo(overrides: Partial<AdminPromo> = {}): AdminPromo {
  return {
    _count: { orders: 2, usages: 3 },
    code: "SAVE20",
    createdAt: "2026-08-01T08:00:00.000Z",
    deletedAt: null,
    discountType: "PERCENTAGE",
    discountValue: "20.00",
    expiresAt: "2099-12-31T23:59:00.000Z",
    id: promoId,
    isActive: true,
    maxDiscount: "500.00",
    minOrderValue: "1000.00",
    perUserLimit: 2,
    updatedAt: "2026-08-01T08:00:00.000Z",
    usageCount: 3,
    usageLimit: 100,
    ...overrides,
  };
}
const state = { page: 1, pageSize: 20, search: "" } as const;

describe("admin promo management", () => {
  it("classifies active, expired, exhausted, and inactive states without inferring schedules", () => {
    const now = new Date("2026-08-15T00:00:00.000Z").getTime();
    expect(promoLifecycle(promo(), now)).toBe("ACTIVE");
    expect(promoLifecycle(promo({ expiresAt: "2026-08-14T00:00:00.000Z" }), now)).toBe("EXPIRED");
    expect(promoLifecycle(promo({ isActive: false }), now)).toBe("INACTIVE");
    expect(promoLifecycle(promo({ usageCount: 100 }), now)).toBe("EXHAUSTED");
    expect(promoLifecycle(promo({ expiresAt: null, isActive: false }), now)).toBe("INACTIVE");
  });

  it("renders list routes, discount limits, usage, and lifecycle labels", () => {
    const items = [
      promo(),
      promo({ code: "EXPIRED", expiresAt: "2020-01-01T00:00:00.000Z", id: "promo-expired" }),
      promo({ code: "PLANNED", id: "promo-scheduled", isActive: false }),
    ];
    renderWithProviders(
      <AdminPromosView
        promos={{ items, meta: { limit: 20, page: 1, total: 3, totalPages: 1 } }}
        state={state}
      />,
    );
    expect(screen.getByRole("link", { name: "Create promo code" })).toHaveAttribute(
      "href",
      "/promos/new",
    );
    const firstRow = screen.getByRole("row", { name: /SAVE20/ });
    expect(within(firstRow).getByText("20% (max ₹500.00)")).toBeVisible();
    expect(within(firstRow).getByText("3 / 100")).toBeVisible();
    expect(within(firstRow).getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/promos/${promoId}/edit`,
    );
    expect(screen.getByText("EXPIRED", { selector: ".ui-badge" })).toBeVisible();
    expect(screen.getByText("INACTIVE")).toBeVisible();
    expect(screen.getByText("Manual activation required")).toBeVisible();
  });

  it("requires confirmation for deactivation and soft deletion", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ data: {}, success: true }),
    );
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    const { rerender } = renderWithProviders(
      <AdminPromosView
        promos={{ items: [promo()], meta: { limit: 20, page: 1, total: 1, totalPages: 1 } }}
        state={state}
      />,
    );
    await actor.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(fetch).not.toHaveBeenCalled();
    await actor.click(screen.getByRole("button", { name: "Confirm deactivate" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(fetch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ body: JSON.stringify({ isActive: false }), method: "PUT" }),
    );

    rerender(
      <AdminPromosView
        promos={{ items: [promo()], meta: { limit: 20, page: 1, total: 1, totalPages: 1 } }}
        state={state}
      />,
    );
    await actor.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("soft-archives");
    await actor.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });

  it("blocks invalid percentage and past-expiry create cases locally", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(<PromoForm />);
    await actor.type(screen.getByRole("textbox", { name: /Promo code/ }), "badpromo");
    await actor.type(screen.getByRole("spinbutton", { name: /Discount value/ }), "150");
    await actor.click(screen.getByRole("button", { name: "Save promo code" }));
    expect(await screen.findByText("Percentage discount cannot exceed 100")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();

    await actor.clear(screen.getByRole("spinbutton", { name: /Discount value/ }));
    await actor.type(screen.getByRole("spinbutton", { name: /Discount value/ }), "20");
    await actor.type(screen.getByLabelText("Expires at"), "2020-01-01T00:00");
    await actor.click(screen.getByRole("button", { name: "Save promo code" }));
    expect(await screen.findByText("Expiry date must be in the future")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps server field errors and submits valid numeric limits", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            errors: [{ field: "code", message: "A promo code with this code already exists" }],
            message: "Validation failed",
            success: false,
          },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { id: promoId }, success: true }, { status: 201 }),
      );
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(<PromoForm />);
    await actor.type(screen.getByRole("textbox", { name: /Promo code/ }), "save20");
    await actor.type(screen.getByRole("spinbutton", { name: /Discount value/ }), "20");
    await actor.type(screen.getByRole("spinbutton", { name: "Total usage limit" }), "100");
    await actor.click(screen.getByRole("button", { name: "Save promo code" }));
    expect(await screen.findByText("A promo code with this code already exists")).toBeVisible();
    await actor.clear(screen.getByRole("textbox", { name: /Promo code/ }));
    await actor.type(screen.getByRole("textbox", { name: /Promo code/ }), "fresh20");
    await actor.click(screen.getByRole("button", { name: "Save promo code" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/promos"));
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toMatchObject({
      code: "FRESH20",
      discountType: "PERCENTAGE",
      discountValue: 20,
      usageLimit: 100,
    });
  });

  it("edits an expired promo without resubmitting its unchanged past expiry", async () => {
    const expired = {
      ...promo({ expiresAt: "2020-01-01T00:00:00.000Z" }),
      usages: [],
    } as AdminPromoDetail;
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ data: {}, success: true }),
    );
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(<PromoForm promo={expired} />);
    const code = screen.getByRole("textbox", { name: /Promo code/ });
    await actor.clear(code);
    await actor.type(code, "renewed");
    await actor.click(screen.getByRole("button", { name: "Save promo code" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/promos"));
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ code: "RENEWED" });
  });

  it("shows filtered empty and retryable error states", () => {
    const { rerender } = renderWithProviders(
      <AdminPromosView
        promos={{ items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } }}
        state={{ ...state, isActive: false }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No matching promo codes" })).toBeVisible();
    rerender(<AdminPromosView error="Promo codes could not be loaded." state={state} />);
    expect(screen.getByRole("heading", { name: "Promo codes unavailable" })).toBeVisible();
  });
});
