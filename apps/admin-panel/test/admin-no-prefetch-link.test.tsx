import { renderWithProviders } from "@repo/test-utils";
import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminNoPrefetchLink } from "../app/admin-no-prefetch-link";

vi.mock("next/link", () => ({
  default: ({ children, prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => (
    <a data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

describe("admin no-prefetch link", () => {
  it("disables automatic route prefetching while preserving navigation props", () => {
    renderWithProviders(
      <AdminNoPrefetchLink className="detail-link" href="/users/user-1">
        View user
      </AdminNoPrefetchLink>,
    );

    const link = screen.getByRole("link", { name: "View user" });
    expect(link).toHaveAttribute("href", "/users/user-1");
    expect(link).toHaveClass("detail-link");
    expect(link).toHaveAttribute("data-prefetch", "false");
  });
});
