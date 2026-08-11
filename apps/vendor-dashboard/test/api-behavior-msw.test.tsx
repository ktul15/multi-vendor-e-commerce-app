import { renderWithProviders } from "@repo/test-utils";
import { HttpResponse, http } from "msw";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductActions } from "../app/product-actions";
import { StoreProfileForm } from "../app/store-profile-form";
import { VendorAuthPanel } from "../app/login/vendor-auth-panel";
import { VendorOrderDetailView } from "../app/vendor-order-detail";
import type { VendorOrder } from "../src/lib/order-data";
import type { VendorProfile } from "../src/lib/vendor-profile-api";
import { server } from "./msw";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const profile: VendorProfile = {
  description: "Handmade goods",
  id: "profile-1",
  status: "APPROVED",
  storeBanner: null,
  storeLogo: null,
  storeName: "Maple Market",
  user: { avatar: null, email: "vendor@example.test", name: "Vendor" },
  userId: "vendor-1",
};

const order: VendorOrder = {
  allowedNextStatuses: ["SHIPPED"],
  createdAt: "2026-08-09T08:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  items: [],
  order: {
    createdAt: "2026-08-09T08:00:00.000Z",
    id: "order-1",
    notes: null,
    orderNumber: "ORD-42",
    payment: null,
    shippingAddress: {
      city: "Pune",
      country: "India",
      fullName: "Asha Buyer",
      phone: "12345",
      state: "MH",
      street: "42 Market Road",
      zipCode: "411001",
    },
    updatedAt: "2026-08-09T08:00:00.000Z",
    user: { email: "asha@example.test", id: "customer-1", name: "Asha Buyer" },
  },
  orderId: "order-1",
  status: "PROCESSING",
  subtotal: "500.00",
  trackingCarrier: null,
  trackingNumber: null,
  updatedAt: "2026-08-09T08:00:00.000Z",
  vendorId: "vendor-1",
};

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
  navigation.replace.mockReset();
  document.cookie = "vendor_csrf_token=csrf-token; path=/";
});

describe("vendor browser API behavior with MSW", () => {
  it("isolates session restore and maps login API field errors", async () => {
    server.use(
      http.get("http://localhost:3000/api/auth/session", () =>
        HttpResponse.json({ success: false }, { status: 401 }),
      ),
      http.post("http://localhost:3000/api/auth/login", async ({ request }) => {
        await expect(request.json()).resolves.toMatchObject({
          email: "buyer@example.com",
          password: "secret123",
        });
        return HttpResponse.json(
          {
            errors: [{ field: "email", message: "Email is not a vendor account" }],
            message: "Vendor access required",
            success: false,
          },
          { status: 403 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<VendorAuthPanel initialMode="login" returnTo="/" />);
    await screen.findByRole("button", { name: "Sign in" });

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "buyer@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is not a vendor account")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Vendor access required");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("keeps a destructive product conflict in its confirmation dialog", async () => {
    server.use(
      http.delete(
        "http://localhost:3000/api/products/11111111-1111-4111-8111-111111111111",
        ({ request }) => {
          expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
          return HttpResponse.json(
            { message: "Product cannot be deleted because it has order history", success: false },
            { status: 409 },
          );
        },
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

  it("submits trimmed shipment tracking and refreshes after success", async () => {
    server.use(
      http.put(
        "http://localhost:3000/api/orders/11111111-1111-4111-8111-111111111111/status",
        async ({ request }) => {
          expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
          await expect(request.json()).resolves.toEqual({
            status: "SHIPPED",
            trackingCarrier: "BlueDart",
            trackingNumber: "TRACK-42",
          });
          return HttpResponse.json({ success: true });
        },
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<VendorOrderDetailView order={order} />);
    await user.click(screen.getByRole("button", { name: "Mark shipped" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Mark shipped" })).toBeDisabled();
    await user.type(
      within(dialog).getByRole("textbox", { name: "Tracking carrier" }),
      " BlueDart ",
    );
    await user.type(within(dialog).getByRole("textbox", { name: "Tracking number" }), " TRACK-42 ");
    await user.click(within(dialog).getByRole("button", { name: "Mark shipped" }));

    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });

  it("sends store changes as multipart and renders the persisted response", async () => {
    server.use(
      http.put("http://localhost:3000/api/vendor-profile", async ({ request }) => {
        expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
        const body = await request.formData();
        expect(body.get("storeName")).toBe("Maple Market Updated");
        return HttpResponse.json({
          data: { ...profile, storeName: "Maple Market Updated" },
          success: true,
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<StoreProfileForm initialProfile={profile} />);
    await user.clear(screen.getByRole("textbox", { name: "Store name" }));
    await user.type(screen.getByRole("textbox", { name: "Store name" }), "Maple Market Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Store profile updated.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Store name" })).toHaveValue("Maple Market Updated");
  });
});
