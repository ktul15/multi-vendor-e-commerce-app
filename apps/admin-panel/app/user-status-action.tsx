"use client";

import { Button, Dialog } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AdminUser } from "../src/lib/user-data";

function csrfToken(): string | undefined {
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : undefined;
}

export function UserStatusAction({ user }: Readonly<{ user: AdminUser }>) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const action = user.isBanned ? "unban" : "ban";
  const actionLabel = user.isBanned ? "Unban" : "Ban";

  if (user.role === "ADMIN") {
    return <span className="admin-user-protected">Protected account</span>;
  }

  const submit = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch(`/api/users/${user.id}/status`, {
        body: JSON.stringify({ action }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Account status could not be updated");
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Account status could not be updated");
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
        variant={user.isBanned ? "secondary" : "danger"}
      >
        {actionLabel}
      </Button>
      <Dialog
        description={
          user.isBanned
            ? `${user.name} will regain access to their account.`
            : `${user.name} will be unable to sign in until an administrator unbans the account.`
        }
        footer={
          <>
            <Button disabled={pending} onClick={() => setOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              loading={pending}
              loadingLabel={`${actionLabel}ning account`}
              onClick={() => void submit()}
              variant={user.isBanned ? "primary" : "danger"}
            >
              Confirm {actionLabel.toLowerCase()}
            </Button>
          </>
        }
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        open={open}
        title={`${actionLabel} ${user.name}?`}
      >
        {error ? (
          <p className="admin-user-action-error" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
