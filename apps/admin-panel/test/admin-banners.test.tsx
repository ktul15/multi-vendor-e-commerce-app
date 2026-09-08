import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminBannersView } from "../app/admin-banners-view";
import { BannerForm } from "../app/banner-form";
import type { AdminBanner } from "../src/lib/banner-data";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img"> & { unoptimized?: boolean }) => {
    const { unoptimized, ...rest } = props;
    void unoptimized;
    return createElement("img", rest);
  },
}));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
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
const banner: AdminBanner = {
  createdAt: "2026-08-01T00:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  imageUrl: "https://cdn.test/sale.webp",
  isActive: true,
  linkUrl: "https://example.test/sale",
  position: 0,
  title: "Summer sale",
  updatedAt: "2026-08-15T00:00:00.000Z",
};
const banners = { items: [banner], meta: { limit: 20, page: 1, total: 1, totalPages: 1 } };

describe("admin banner management", () => {
  it("renders ordered metadata and a storefront preview", async () => {
    const actor = userEvent.setup();
    renderWithProviders(<AdminBannersView banners={banners} state={{ page: 1, pageSize: 20 }} />);
    expect(screen.getByText("#0")).toBeVisible();
    expect(screen.getByText("Active", { selector: ".ui-badge" })).toBeVisible();
    expect(screen.getByText(/does not schedule banners by date/i)).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "Preview" }));
    const dialog = screen.getByRole("dialog", { name: "Summer sale" });
    expect(within(dialog).getByAltText("Summer sale")).toHaveAttribute("src", banner.imageUrl);
    expect(within(dialog).getByText(/Active now/)).toBeVisible();
  });
  it("confirms deactivation and deletion before mutating", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const actor = userEvent.setup();
    renderWithProviders(<AdminBannersView banners={banners} state={{ page: 1, pageSize: 20 }} />);
    await actor.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(fetch).not.toHaveBeenCalled();
    await actor.click(screen.getByRole("button", { name: "Deactivate banner" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect((fetch.mock.calls[0]?.[1]?.body as FormData).get("isActive")).toBe("false");
    await actor.click(screen.getByRole("button", { name: "Delete" }));
    await actor.click(screen.getByRole("button", { name: "Delete banner" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });
  it("shows empty and retryable failure states", () => {
    const { rerender } = renderWithProviders(
      <AdminBannersView
        banners={{ items: [], meta: { limit: 20, page: 1, total: 0, totalPages: 1 } }}
        state={{ page: 1, pageSize: 20 }}
      />,
    );
    expect(screen.getByRole("heading", { name: "No banners found" })).toBeVisible();
    rerender(<AdminBannersView error="Offline" state={{ page: 1, pageSize: 20 }} />);
    expect(screen.getByRole("heading", { name: "Banners unavailable" })).toBeVisible();
  });
});

describe("banner editor", () => {
  it("validates image type, size, URL, and whole-number position", async () => {
    const actor = userEvent.setup({ applyAccept: false });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:valid-banner");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    renderWithProviders(<BannerForm />);
    const image = screen.getByLabelText("Banner image");
    await actor.upload(image, new File(["image"], "valid.webp", { type: "image/webp" }));
    expect(screen.getByAltText("Banner preview")).toHaveAttribute("src", "blob:valid-banner");
    await actor.upload(image, new File(["text"], "bad.txt", { type: "text/plain" }));
    expect(screen.getByText("Choose a JPEG, PNG, or WebP image")).toBeVisible();
    expect(screen.queryByAltText("Banner preview")).not.toBeInTheDocument();
    await actor.type(screen.getByLabelText(/Title/), "Sale");
    await actor.type(screen.getByLabelText("Destination URL (optional)"), "relative");
    const position = screen.getByLabelText(/Position/);
    await actor.clear(position);
    await actor.type(position, "1.5");
    await actor.click(screen.getByRole("button", { name: "Create banner" }));
    expect(screen.getByText("Enter an absolute URL")).toBeVisible();
    expect(screen.getByText(/non-negative whole number/)).toBeVisible();
    await actor.clear(screen.getByLabelText("Destination URL (optional)"));
    await actor.clear(position);
    await actor.type(position, "1");
    await actor.click(screen.getByRole("button", { name: "Create banner" }));
    expect(screen.getByText("Banner image is required")).toBeVisible();
  });

  it("previews an upload, reports progress, maps server errors, and retries", async () => {
    const actor = userEvent.setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:banner");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    let attempts = 0;
    class FakeRequest {
      status = 0;
      responseText = "";
      listeners: Record<string, () => void> = {};
      upload = {
        addEventListener: (_: string, listener: (event: ProgressEvent) => void) => {
          this.progress = listener;
        },
      };
      progress?: (event: ProgressEvent) => void;
      open() {}
      setRequestHeader() {}
      addEventListener(name: string, listener: () => void) {
        this.listeners[name] = listener;
      }
      send() {
        attempts += 1;
        this.progress?.({ lengthComputable: true, loaded: 1, total: 2 } as ProgressEvent);
        setTimeout(() => {
          this.status = attempts === 1 ? 400 : 201;
          this.responseText =
            attempts === 1
              ? JSON.stringify({
                  errors: [{ field: "title", message: "Title is unavailable" }],
                  message: "Validation failed",
                })
              : JSON.stringify({ success: true });
          this.listeners.load?.();
        }, 50);
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeRequest);
    renderWithProviders(<BannerForm />);
    await actor.type(screen.getByLabelText(/Title/), "Sale");
    const file = new File(["image"], "sale.webp", { type: "image/webp" });
    await actor.upload(screen.getByLabelText("Banner image"), file);
    expect(screen.getByAltText("Banner preview")).toHaveAttribute("src", "blob:banner");
    await actor.click(screen.getByRole("button", { name: "Create banner" }));
    expect(await screen.findByRole("progressbar", { name: "Uploading banner image" })).toHaveValue(
      50,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Validation failed");
    expect(screen.getByText("Title is unavailable")).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "Retry upload" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/banners"));
    expect(attempts).toBe(2);
  });
});
