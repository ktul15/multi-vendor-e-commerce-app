import { renderWithProviders } from "@repo/test-utils";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLoginPanel } from "../app/login/admin-login-panel";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const response = (body: unknown, status: number) => Response.json(body, { status });

beforeEach(() => {
  navigation.refresh.mockReset();
  navigation.replace.mockReset();
  vi.unstubAllGlobals();
});

describe("admin login", () => {
  it("restores an existing session to a safe return path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ success: true }, 200)),
    );

    renderWithProviders(<AdminLoginPanel returnTo="/orders?page=2" />);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/orders?page=2"));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("validates fields, toggles password visibility, and surfaces access denial", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ success: false }, 401))
      .mockResolvedValueOnce(response({ message: "Admin access required", success: false }, 403));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginPanel returnTo="/" />);
    await screen.findByRole("button", { name: "Sign in" });

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeVisible();
    expect(screen.getByText("Password is required")).toBeVisible();
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "vendor@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Admin access required");
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("normalizes unsafe return paths and prevents duplicate login requests", async () => {
    let resolveLogin!: (value: Response) => void;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response({ success: false }, 401))
      .mockReturnValueOnce(new Promise<Response>((resolve) => (resolveLogin = resolve)));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderWithProviders(<AdminLoginPanel returnTo="https://evil.test/steal" />);
    await screen.findByRole("button", { name: "Sign in" });
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "admin@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123");
    const form = screen.getByRole("button", { name: "Sign in" }).closest("form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    resolveLogin(response({ success: true }, 200));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
  });
});
