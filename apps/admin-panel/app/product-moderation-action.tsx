"use client";

import { Button, Dialog } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ProductModerationAction } from "../src/lib/product-moderation";

type ProductIdentity = Readonly<{ id: string; isActive: boolean; name: string }>;

const copy: Record<
  ProductModerationAction,
  Readonly<{ button: string; description: (name: string) => string; tone: "danger" | "primary" }>
> = {
  activate: {
    button: "Activate",
    description: (name) => `${name} will become visible and available to customers.`,
    tone: "primary",
  },
  deactivate: {
    button: "Deactivate",
    description: (name) => `${name} will be hidden from customers but retained for order history.`,
    tone: "danger",
  },
  delete: {
    button: "Delete",
    description: (name) =>
      `${name} will be permanently deleted. Products with order history must be deactivated instead.`,
    tone: "danger",
  },
};

function csrfToken(): string | undefined {
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : undefined;
}

export function ProductModerationActionButton({
  action,
  product,
  returnToListOnDelete = false,
}: Readonly<{
  action: ProductModerationAction;
  product: ProductIdentity;
  returnToListOnDelete?: boolean;
}>) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const actionCopy = copy[action];

  const submit = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch(`/api/products/${product.id}/moderation`, {
        body: JSON.stringify({ action }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Product could not be updated");
      setOpen(false);
      if (action === "delete" && returnToListOnDelete) router.push("/products");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Product could not be updated");
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
        size="sm"
        variant={actionCopy.tone}
      >
        {actionCopy.button}
      </Button>
      <Dialog
        description={actionCopy.description(product.name)}
        footer={
          <>
            <Button disabled={pending} onClick={() => setOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              loading={pending}
              loadingLabel={`${actionCopy.button} action in progress`}
              onClick={() => void submit()}
              variant={actionCopy.tone}
            >
              Confirm {action}
            </Button>
          </>
        }
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        open={open}
        title={`${actionCopy.button} ${product.name}?`}
      >
        {error ? (
          <p className="admin-product-action-error" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
