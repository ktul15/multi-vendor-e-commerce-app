import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductMediaManager } from "../app/product-media-manager";
import { MAX_PRODUCT_IMAGE_BYTES } from "../app/product-media-manager";
import type { PendingProductImage } from "../app/product-media-manager";
import type { ProductMedia } from "../src/lib/product-data";

const media = (id: string, position: number): ProductMedia => ({
  createdAt: "2026-08-09T00:00:00.000Z",
  id,
  position,
  updatedAt: "2026-08-09T00:00:00.000Z",
  url: `https://images.test/${id}.webp`,
});

function Harness({ initialMedia = [] }: Readonly<{ initialMedia?: ProductMedia[] }>) {
  const [items, setItems] = useState(initialMedia);
  const [pending, setPending] = useState<PendingProductImage[]>([]);
  return (
    <ProductMediaManager
      media={items}
      onMediaChange={setItems}
      onPendingChange={setPending}
      onRetry={vi.fn()}
      pending={pending}
    />
  );
}

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockImplementation((file) => `blob:${(file as File).name}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});

describe("product media manager", () => {
  it("previews accepted files in selection order and exposes keyboard controls", () => {
    render(<Harness />);
    const first = new File(["first"], "first.webp", { type: "image/webp" });
    const second = new File(["second"], "second.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Add images"), {
      target: { files: [first, second] },
    });

    expect(screen.getByAltText("New product image 1")).toHaveAttribute("src", "blob:first.webp");
    expect(screen.getByAltText("New product image 2")).toHaveAttribute("src", "blob:second.png");
    fireEvent.click(screen.getByRole("button", { name: "Move new image 2 earlier" }));
    expect(screen.getByAltText("New product image 1")).toHaveAttribute("src", "blob:second.png");
    fireEvent.click(screen.getByRole("button", { name: "Remove second.png" }));
    expect(screen.queryByText("second.png")).not.toBeInTheDocument();
  });

  it("enforces type, size, and the five-image count before upload", () => {
    render(
      <Harness
        initialMedia={[media("one", 0), media("two", 1), media("three", 2), media("four", 3)]}
      />,
    );
    const input = screen.getByLabelText("Add images");

    fireEvent.change(input, {
      target: { files: [new File(["text"], "notes.txt", { type: "text/plain" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPEG, PNG, or WebP image");

    const oversized = new File(["image"], "large.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: MAX_PRODUCT_IMAGE_BYTES + 1 });
    fireEvent.change(input, { target: { files: [oversized] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Each image must be 5 MB or smaller");

    fireEvent.change(input, {
      target: {
        files: [
          new File(["one"], "one.png", { type: "image/png" }),
          new File(["two"], "two.png", { type: "image/png" }),
        ],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("You can add 1 more image");
  });

  it("preserves saved media while staging an accessible replacement", () => {
    render(<Harness initialMedia={[media("saved-image", 0)]} />);

    fireEvent.change(screen.getByLabelText("Replace image 1"), {
      target: { files: [new File(["replacement"], "replacement.jpg", { type: "image/jpeg" })] },
    });

    expect(screen.getByAltText("Product image 1")).toHaveAttribute("src", "blob:replacement.jpg");
    expect(screen.getByText("Replacement ready to upload")).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove image 1" })).toBeEnabled();
  });

  it("announces upload progress and exposes retry for a failed file", () => {
    const file = new File(["image"], "retry.webp", { type: "image/webp" });
    const retry = vi.fn();
    const common = {
      media: [],
      onMediaChange: vi.fn(),
      onPendingChange: vi.fn(),
      onRetry: retry,
    };
    const { rerender } = render(
      <ProductMediaManager
        {...common}
        pending={[{ file, id: "retry-image", previewUrl: "blob:retry.webp", status: "uploading" }]}
      />,
    );
    expect(screen.getByRole("progressbar", { name: "Uploading image 1" })).toBeVisible();

    rerender(
      <ProductMediaManager
        {...common}
        pending={[
          {
            error: "Network unavailable",
            file,
            id: "retry-image",
            previewUrl: "blob:retry.webp",
            status: "failed",
          },
        ]}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry upload for retry.webp" }));
    expect(retry).toHaveBeenCalledWith("retry-image");
  });

  it("locks selection and media mutations while a save is in progress", () => {
    const file = new File(["image"], "pending.webp", { type: "image/webp" });
    render(
      <ProductMediaManager
        disabled
        media={[media("saved", 0)]}
        onMediaChange={vi.fn()}
        onPendingChange={vi.fn()}
        onRetry={vi.fn()}
        pending={[
          { file, id: "pending-image", previewUrl: "blob:pending.webp", status: "pending" },
        ]}
      />,
    );

    expect(screen.getByLabelText("Add images")).toBeDisabled();
    expect(screen.getByLabelText("Replace image 1")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove image 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove pending.webp" })).toBeDisabled();
  });

  it("releases pending preview URLs when the manager unmounts", () => {
    const file = new File(["image"], "abandoned.webp", { type: "image/webp" });
    const { unmount } = render(
      <ProductMediaManager
        media={[]}
        onMediaChange={vi.fn()}
        onPendingChange={vi.fn()}
        onRetry={vi.fn()}
        pending={[{ file, id: "abandoned", previewUrl: "blob:abandoned.webp", status: "pending" }]}
      />,
    );

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:abandoned.webp");
  });
});
