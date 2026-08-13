"use client";

import { Button, Dialog } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AdminVendor, AdminVendorDetail } from "../src/lib/vendor-data";
import type { VendorAction } from "../src/lib/vendor-lifecycle";

type VendorIdentity = Pick<AdminVendor | AdminVendorDetail, "id" | "status" | "storeName"> &
  Readonly<{ user: Readonly<{ isBanned: boolean }> }>;

const actionCopy: Record<
  VendorAction,
  Readonly<{ button: string; description: (name: string) => string; tone: "danger" | "primary" }>
> = {
  approve: {
    button: "Approve",
    description: (name) => `${name} will be approved and can access marketplace selling tools.`,
    tone: "primary",
  },
  reject: {
    button: "Reject",
    description: (name) => `${name} will be rejected and cannot sell unless later approved.`,
    tone: "danger",
  },
  suspend: {
    button: "Suspend",
    description: (name) =>
      `${name} will lose access to marketplace selling tools until re-approved.`,
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

export function VendorLifecycleAction({
  action,
  vendor,
}: Readonly<{ action: VendorAction; vendor: VendorIdentity }>) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const copy = actionCopy[action];
  const description =
    action === "approve" && vendor.user.isBanned
      ? `${vendor.storeName} will be approved, but the owner account remains banned and cannot sign in until separately unbanned.`
      : copy.description(vendor.storeName);

  const submit = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch(`/api/vendors/${vendor.id}/lifecycle`, {
        body: JSON.stringify({ action }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Vendor status could not be updated");
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Vendor status could not be updated");
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
        variant={copy.tone}
      >
        {copy.button}
      </Button>
      <Dialog
        description={description}
        footer={
          <>
            <Button disabled={pending} onClick={() => setOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              loading={pending}
              loadingLabel={`${copy.button} action in progress`}
              onClick={() => void submit()}
              variant={copy.tone}
            >
              Confirm {action}
            </Button>
          </>
        }
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        open={open}
        title={`${copy.button} ${vendor.storeName}?`}
      >
        {error ? (
          <p className="admin-vendor-action-error" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
