import { renderWithProviders } from "@repo/test-utils";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProfileForm } from "../app/store-profile-form";
import type { VendorProfile } from "../src/lib/vendor-profile-api";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const approvedProfile: VendorProfile = {
  description: "Handmade goods",
  id: "profile-1",
  status: "APPROVED",
  storeBanner: "https://images.test/banner.webp",
  storeLogo: "https://images.test/logo.webp",
  storeName: "Maple Market",
  user: { avatar: null, email: "vendor@example.test", name: "Vendor" },
  userId: "vendor-1",
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

beforeEach(() => {
  navigation.refresh.mockReset();
  navigation.replace.mockReset();
  vi.unstubAllGlobals();
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:store-image");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  document.cookie = "vendor_csrf_token=csrf-token; path=/";
});

describe("store profile form", () => {
  it("loads existing values, validates fields, and maps backend field errors", async () => {
    const fetch = vi.fn(async () =>
      response(
        {
          errors: [{ field: "storeName", message: "Store name must be unique" }],
          message: "A store with this name already exists",
          success: false,
        },
        409,
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<StoreProfileForm initialProfile={approvedProfile} />);

    expect(screen.getByRole("textbox", { name: "Store name" })).toHaveValue("Maple Market");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Handmade goods");
    await user.clear(screen.getByRole("textbox", { name: "Store name" }));
    await user.type(screen.getByRole("textbox", { name: "Store name" }), "M");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Store name must be at least 2 characters")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: "Store name" }), "aple");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Store name must be unique")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("already exists");
  });

  it("validates media, sends multipart changes, and resets to persisted values", async () => {
    const updated = {
      ...approvedProfile,
      description: "Freshly updated",
      storeLogo: "https://images.test/new.webp",
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(response({ data: updated, success: true }));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<StoreProfileForm initialProfile={approvedProfile} />);

    fireEvent.change(screen.getByLabelText("Replace logo"), {
      target: { files: [new File(["notes"], "notes.txt", { type: "text/plain" })] },
    });
    expect(await screen.findByText("Choose a JPEG, PNG, or WebP image.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Replace logo"), {
      target: { files: [new File(["image"], "logo.webp", { type: "image/webp" })] },
    });
    fireEvent.change(screen.getByLabelText("Replace banner"), {
      target: { files: [new File(["banner"], "banner.png", { type: "image/png" })] },
    });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await user.clear(screen.getByRole("textbox", { name: "Description" }));
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Freshly updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Store profile updated.")).toBeVisible();
    const [, options] = fetch.mock.calls[0]!;
    expect(options).toMatchObject({ headers: { "X-CSRF-Token": "csrf-token" }, method: "PUT" });
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.body as FormData).get("logo")).toBeInstanceOf(File);
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Freshly updated");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("refreshes authoritative values and renders suspended profiles read-only", async () => {
    const suspended = { ...approvedProfile, status: "SUSPENDED" as const };
    const fetch = vi.fn(async () =>
      response({ data: { ...suspended, storeName: "Persisted Store" }, success: true }),
    );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<StoreProfileForm initialProfile={suspended} />);

    expect(screen.getByRole("textbox", { name: "Store name" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.getByText(/read-only while your vendor status is suspended/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Store name" })).toHaveValue("Persisted Store"),
    );
    expect(fetch).toHaveBeenCalledWith("/api/vendor-profile", { cache: "no-store" });
  });
});
