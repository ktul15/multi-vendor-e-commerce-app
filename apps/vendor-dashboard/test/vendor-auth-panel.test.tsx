import { renderWithProviders } from "@repo/test-utils";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorAuthPanel } from "../app/login/vendor-auth-panel";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

describe("vendor authentication forms", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    navigation.replace.mockReset();
    vi.unstubAllGlobals();
  });

  it("restores an existing vendor session to a safe return URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: true }, 200)),
    );

    renderWithProviders(<VendorAuthPanel initialMode="login" returnTo="/orders?page=2" />);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/orders?page=2"));
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("validates login fields and maps backend field errors", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            errors: [{ field: "email", message: "Email is not a vendor account" }],
            message: "Vendor access required",
            success: false,
          },
          403,
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<VendorAuthPanel initialMode="login" returnTo="/" />);
    await screen.findByRole("button", { name: "Sign in" });

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeVisible();
    expect(screen.getByText("Password is required")).toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "buyer@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is not a vendor account")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Vendor access required");
  });

  it("registers a vendor and navigates only after success", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ success: false }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true }, 201));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<VendorAuthPanel initialMode="register" returnTo="/store" />);
    await screen.findByRole("button", { name: "Create vendor account" });

    await user.type(screen.getByRole("textbox", { name: "Your name" }), "Vendor Owner");
    await user.type(screen.getByRole("textbox", { name: "Store name" }), "Maple Market");
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "owner@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123");
    await user.type(screen.getByLabelText(/^Confirm password/), "secret123");
    await user.click(screen.getByRole("button", { name: "Create vendor account" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/store"));
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
