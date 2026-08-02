import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, Dialog, ErrorState, Input, Select } from "../src";

describe("shared dashboard components", () => {
  it("exposes button loading and keyboard focus states", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button>Save product</Button>
        <Button loading loadingLabel="Saving product">
          Save product
        </Button>
      </>,
    );

    await user.tab();

    expect(screen.getByRole("button", { name: "Save product" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Saving product" })).toBeDisabled();
  });

  it("connects form labels and merges caller-provided accessibility state", () => {
    render(
      <>
        <span id="product-requirements">Use at least three characters</span>
        <Input
          aria-describedby="product-requirements"
          error="A product name is required"
          label="Product name"
        />
        <Select hint="Choose the storefront state" label="Status">
          <option>Draft</option>
        </Select>
        <Input aria-invalid="true" label="Externally validated field" />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Product name" });
    const select = screen.getByRole("combobox", { name: "Status" });

    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription(
      "Use at least three characters A product name is required",
    );
    expect(select).toHaveAccessibleDescription("Choose the storefront state");
    expect(screen.getByRole("textbox", { name: "Externally validated field" })).toBeInvalid();
  });

  it("labels dialogs and handles native cancel events", () => {
    const onClose = vi.fn();
    render(
      <Dialog description="Review this change" onClose={onClose} open title="Confirm update">
        Dialog content
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Confirm update" });
    expect(dialog).toHaveAccessibleDescription("Review this change");

    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("synchronizes native and prop-driven dialog closure", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog onClose={onClose} open title="Native close example">
        Dialog content
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Native close example",
    }) as HTMLDialogElement;

    dialog.close();
    expect(onClose).toHaveBeenCalledOnce();

    onClose.mockClear();
    rerender(
      <Dialog onClose={onClose} open title="Prop close example">
        Dialog content
      </Dialog>,
    );
    rerender(
      <Dialog onClose={onClose} open={false} title="Prop close example">
        Dialog content
      </Dialog>,
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not submit a surrounding form when closing a dialog", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Dialog onClose={onClose} open title="Form-safe dialog">
          Dialog content
        </Dialog>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("announces error states", () => {
    render(<ErrorState description="Try the request again" title="Orders failed to load" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Orders failed to load");
  });
});
