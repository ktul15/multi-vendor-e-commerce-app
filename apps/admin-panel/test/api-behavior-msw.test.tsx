import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCategoriesView } from "../app/admin-categories-view";
import { CommissionRateAction } from "../app/commission-rate-action";
import { AdminLoginPanel } from "../app/login/admin-login-panel";
import { ProductModerationActionButton } from "../app/product-moderation-action";
import { UserStatusAction } from "../app/user-status-action";
import { VendorLifecycleAction } from "../app/vendor-lifecycle-action";
import type { AdminCategoryTreeNode } from "../src/lib/category-data";
import type { AdminUser } from "../src/lib/user-data";
import { server } from "./msw";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img"> & { unoptimized?: boolean }) => {
    const { unoptimized, ...imageProps } = props;
    void unoptimized;
    return createElement("img", imageProps);
  },
}));

const user: AdminUser = {
  createdAt: "2026-08-09T08:00:00.000Z",
  email: "asha@example.test",
  id: "11111111-1111-4111-8111-111111111111",
  isBanned: false,
  isVerified: true,
  name: "Asha Buyer",
  role: "CUSTOMER",
  vendorProfile: null,
};

const category: AdminCategoryTreeNode = {
  children: [],
  createdAt: "2026-08-09T08:00:00.000Z",
  id: "22222222-2222-4222-8222-222222222222",
  image: null,
  name: "Electronics",
  parentId: null,
  slug: "electronics",
  updatedAt: "2026-08-09T08:00:00.000Z",
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
  navigation.push.mockReset();
  navigation.refresh.mockReset();
  navigation.replace.mockReset();
  vi.unstubAllGlobals();
  document.cookie = "admin_csrf_token=csrf-token; path=/";
});

describe("admin browser API behavior with MSW", () => {
  it("isolates session restore and maps admin-login field errors", async () => {
    server.use(
      http.get("http://localhost:3000/api/auth/session", () =>
        HttpResponse.json({ success: false }, { status: 401 }),
      ),
      http.post("http://localhost:3000/api/auth/login", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          email: "vendor@example.test",
          password: "secret123",
        });
        return HttpResponse.json(
          {
            errors: [{ field: "email", message: "Email is not an administrator account" }],
            message: "Admin access required",
            success: false,
          },
          { status: 403 },
        );
      }),
    );
    const actor = userEvent.setup();
    renderWithProviders(<AdminLoginPanel returnTo="/" />);
    await screen.findByRole("button", { name: "Sign in" });

    await actor.type(screen.getByRole("textbox", { name: "Email address" }), "vendor@example.test");
    await actor.type(screen.getByLabelText(/^Password/), "secret123");
    await actor.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is not an administrator account")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Admin access required");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("keeps an account-status conflict inside its confirmation dialog", async () => {
    server.use(
      http.patch(`http://localhost:3000/api/users/${user.id}/status`, async ({ request }) => {
        expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
        await expect(request.json()).resolves.toEqual({ action: "ban" });
        return HttpResponse.json(
          { message: "User is already banned", success: false },
          { status: 409 },
        );
      }),
    );
    const actor = userEvent.setup();
    renderWithProviders(<UserStatusAction user={user} />);

    await actor.click(screen.getByRole("button", { name: "Ban" }));
    const dialog = screen.getByRole("dialog", { name: "Ban Asha Buyer?" });
    await actor.click(within(dialog).getByRole("button", { name: "Confirm ban" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("already banned");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("forwards a valid vendor lifecycle transition and refreshes authoritative state", async () => {
    const vendorId = "33333333-3333-4333-8333-333333333333";
    server.use(
      http.patch(`http://localhost:3000/api/vendors/${vendorId}/lifecycle`, async ({ request }) => {
        expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
        await expect(request.json()).resolves.toEqual({ action: "approve" });
        return HttpResponse.json({ data: { status: "APPROVED" }, success: true });
      }),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <VendorLifecycleAction
        action="approve"
        vendor={{
          id: vendorId,
          status: "PENDING",
          storeName: "Asha Market",
          user: { isBanned: false },
        }}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Approve" }));
    await actor.click(screen.getByRole("button", { name: "Confirm approve" }));

    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("preserves moderation context when the backend rejects a stale action", async () => {
    const productId = "44444444-4444-4444-8444-444444444444";
    server.use(
      http.patch(
        `http://localhost:3000/api/products/${productId}/moderation`,
        async ({ request }) => {
          expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
          await expect(request.json()).resolves.toEqual({ action: "deactivate" });
          return HttpResponse.json(
            { message: "Product is already inactive", success: false },
            { status: 409 },
          );
        },
      ),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <ProductModerationActionButton
        action="deactivate"
        product={{ id: productId, isActive: true, name: "Linen Shirt" }}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Deactivate" }));
    const dialog = screen.getByRole("dialog", { name: "Deactivate Linen Shirt?" });
    await actor.click(within(dialog).getByRole("button", { name: "Confirm deactivate" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("already inactive");
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("submits a confirmed commission percentage with CSRF protection", async () => {
    server.use(
      http.patch("http://localhost:3000/api/commission", async ({ request }) => {
        expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
        await expect(request.json()).resolves.toEqual({ rate: 12.25 });
        return HttpResponse.json({ data: { rate: 12.25 }, success: true });
      }),
    );
    const actor = userEvent.setup();
    renderWithProviders(
      <CommissionRateAction currentRate={10} defaultRate={10} target={{ kind: "platform" }} />,
    );

    await actor.click(screen.getByRole("button", { name: "Edit rate" }));
    const dialog = screen.getByRole("dialog", { name: "Update commission rate" });
    const rate = within(dialog).getByRole("spinbutton", { name: "Commission rate (%)" });
    await actor.clear(rate);
    await actor.type(rate, "12.25");
    await actor.click(within(dialog).getByRole("button", { name: "Confirm rate" }));

    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });

  it("sends category hierarchy as multipart form data", async () => {
    let submitted: FormData | undefined;
    server.use(
      http.post("http://localhost:3000/api/categories", async ({ request }) => {
        expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
        submitted = await request.formData();
        return HttpResponse.json({ data: { id: "category-new" }, success: true }, { status: 201 });
      }),
    );
    const actor = userEvent.setup();
    renderWithProviders(<AdminCategoriesView categories={[category]} />);

    await actor.click(screen.getByRole("button", { name: "Create category" }));
    const dialog = screen.getByRole("dialog", { name: "Create category" });
    await actor.type(within(dialog).getByRole("textbox", { name: "Category name" }), "Wearables");
    await actor.selectOptions(within(dialog).getByLabelText("Parent category"), category.id);
    await actor.click(within(dialog).getByRole("button", { name: "Save category" }));

    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(submitted?.get("name")).toBe("Wearables");
    expect(submitted?.get("parentId")).toBe(category.id);
    expect(submitted?.has("image")).toBe(false);
  });
});
