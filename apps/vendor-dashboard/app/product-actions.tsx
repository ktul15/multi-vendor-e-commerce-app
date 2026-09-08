"use client";

import { Button, Dialog } from "@repo/ui";
import Link from "next/link";
import { useRef, useState } from "react";
import { useVendorDataRefresh } from "./vendor-data-coherence";

function csrfToken(): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "vendor_csrf_token")
    ?.slice(1)
    .join("=");
}

export function ProductActions({ id, name }: Readonly<{ id: string; name: string }>) {
  const refreshVendorData = useVendorDataRefresh();
  const deletionInFlight = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const deleteProduct = async () => {
    if (deletionInFlight.current) return;
    deletionInFlight.current = true;
    setDeleting(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        headers: token ? { "X-CSRF-Token": decodeURIComponent(token) } : {},
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => undefined)) as
        | Readonly<{ message?: string }>
        | undefined;
      if (!response.ok) throw new Error(payload?.message ?? "Product could not be deleted");
      setConfirming(false);
      await refreshVendorData(["dashboard", "inventory"]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Product could not be deleted");
    } finally {
      deletionInFlight.current = false;
      setDeleting(false);
    }
  };

  return (
    <div className="vendor-product-actions">
      <Link
        aria-label={`Edit ${name}`}
        className="ui-button ui-button--ghost ui-button--sm"
        href={`/products/${id}/edit`}
      >
        Edit
      </Link>
      <Button
        aria-label={`Delete ${name}`}
        onClick={() => {
          setError(undefined);
          setConfirming(true);
        }}
        size="sm"
        variant="danger"
      >
        Delete
      </Button>
      <Dialog
        description={`Delete “${name}”? This permanently removes its variants and media. Products with order history cannot be deleted.`}
        footer={
          <>
            <Button disabled={deleting} onClick={() => setConfirming(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              loading={deleting}
              loadingLabel="Deleting product"
              onClick={() => void deleteProduct()}
              variant="danger"
            >
              Delete product
            </Button>
          </>
        }
        onClose={() => {
          if (!deleting) setConfirming(false);
        }}
        open={confirming}
        title="Delete product"
      >
        {error ? (
          <p className="vendor-product-delete-error" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
