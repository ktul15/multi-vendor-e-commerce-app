"use client";

import { Button, Dialog, Input } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type CommissionTarget =
  | Readonly<{ kind: "platform" }>
  | Readonly<{ id: string; kind: "vendor"; storeName: string }>;

function csrfToken(): string | undefined {
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : undefined;
}

function validateRate(value: string): string | undefined {
  if (!value.trim()) return "Enter a commission rate.";
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return "Commission rate must be between 0 and 100.";
  }
  return undefined;
}

export function CommissionRateAction({
  currentRate,
  defaultRate,
  target,
}: Readonly<{
  currentRate: number | null;
  defaultRate: number;
  target: CommissionTarget;
}>) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [mode, setMode] = useState<"edit" | "reset">();
  const [rate, setRate] = useState(String(currentRate ?? defaultRate));
  const [validationError, setValidationError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [pending, setPending] = useState(false);
  const isVendor = target.kind === "vendor";
  const endpoint = isVendor ? `/api/vendors/${target.id}/commission` : "/api/commission";
  const subject = isVendor ? target.storeName : "the platform default";

  const close = () => {
    if (pending) return;
    setMode(undefined);
    setValidationError(undefined);
    setRequestError(undefined);
  };

  const openEdit = () => {
    setRate(String(currentRate ?? defaultRate));
    setValidationError(undefined);
    setRequestError(undefined);
    setMode("edit");
  };

  const submit = async () => {
    if (requestInFlight.current || !mode) return;
    const nextRate = mode === "reset" ? null : Number(rate);
    if (mode === "edit") {
      const error = validateRate(rate);
      setValidationError(error);
      if (error) return;
    }

    requestInFlight.current = true;
    setPending(true);
    setRequestError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch(endpoint, {
        body: JSON.stringify({ rate: nextRate }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Commission rate could not be updated");
      setMode(undefined);
      router.refresh();
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Commission rate could not be updated",
      );
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  };

  const resetMode = mode === "reset";
  const description = resetMode
    ? `${subject} will use the current platform default of ${defaultRate.toFixed(2)}%.`
    : `Confirm the commission percentage that will apply to ${subject}.`;

  return (
    <div className="admin-commission-actions">
      <Button onClick={openEdit} size="sm">
        {isVendor && currentRate !== null ? "Edit override" : "Edit rate"}
      </Button>
      {isVendor && currentRate !== null ? (
        <Button
          onClick={() => {
            setValidationError(undefined);
            setRequestError(undefined);
            setMode("reset");
          }}
          size="sm"
          variant="secondary"
        >
          Use platform default
        </Button>
      ) : null}
      <Dialog
        description={description}
        footer={
          <>
            <Button disabled={pending} onClick={close} variant="ghost">
              Cancel
            </Button>
            <Button
              loading={pending}
              loadingLabel="Commission update in progress"
              onClick={() => void submit()}
              variant={resetMode ? "secondary" : "primary"}
            >
              {resetMode ? "Confirm platform default" : "Confirm rate"}
            </Button>
          </>
        }
        onClose={close}
        open={Boolean(mode)}
        title={
          resetMode
            ? `Remove ${target.kind === "vendor" ? target.storeName : ""} override?`
            : "Update commission rate"
        }
      >
        {!resetMode ? (
          <Input
            error={validationError}
            inputMode="decimal"
            label="Commission rate (%)"
            max="100"
            min="0"
            onChange={(event) => {
              setRate(event.target.value);
              setValidationError(undefined);
            }}
            required
            step="0.01"
            type="number"
            value={rate}
          />
        ) : null}
        {requestError ? (
          <p className="admin-commission-error" role="alert">
            {requestError}
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
