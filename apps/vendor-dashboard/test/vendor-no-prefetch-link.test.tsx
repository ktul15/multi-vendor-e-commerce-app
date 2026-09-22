import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { VendorNoPrefetchLink } from "../app/vendor-no-prefetch-link";

vi.mock("next/link", () => ({
  default: ({ children, prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => (
    <a data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

describe("VendorNoPrefetchLink", () => {
  it("disables Next.js prefetch while preserving link props", () => {
    render(
      <VendorNoPrefetchLink aria-label="Edit product" href="/products/product-1/edit">
        Edit
      </VendorNoPrefetchLink>,
    );

    const link = screen.getByRole("link", { name: "Edit product" });
    expect(link).toHaveAttribute("href", "/products/product-1/edit");
    expect(link).toHaveAttribute("data-prefetch", "false");
  });
});
