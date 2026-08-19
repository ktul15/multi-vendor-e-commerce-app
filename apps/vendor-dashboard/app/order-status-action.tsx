"use client";

import { Button, Dialog, Input, Select } from "@repo/ui";
import { useEffect, useRef, useState } from "react";
import type { VendorOrder } from "../src/lib/order-data";
import { useVendorDataRefresh } from "./vendor-data-coherence";

type NextStatus = VendorOrder["allowedNextStatuses"][number];

type PendingStatusMutation = Readonly<{
  key: string;
  requestBody: string;
  sourceStatus: VendorOrder["status"];
}>;

const labels: Record<NextStatus, string> = {
  CONFIRMED: "Confirm order",
  DELIVERED: "Mark delivered",
  PROCESSING: "Start processing",
  SHIPPED: "Mark shipped",
};

function csrfToken() {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "vendor_csrf_token")
    ?.slice(1)
    .join("=");
}

function pendingMutationStorageKey(orderId: string) {
  return `vendor:order-status-mutation:${orderId}`;
}

function readPendingMutation(orderId: string): PendingStatusMutation | undefined {
  try {
    const value = window.localStorage.getItem(pendingMutationStorageKey(orderId));
    if (!value) return undefined;
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "key" in parsed &&
      typeof parsed.key === "string" &&
      "requestBody" in parsed &&
      typeof parsed.requestBody === "string" &&
      "sourceStatus" in parsed &&
      typeof parsed.sourceStatus === "string"
    ) {
      return parsed as PendingStatusMutation;
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
  return undefined;
}

function writePendingMutation(orderId: string, mutation: PendingStatusMutation) {
  try {
    window.localStorage.setItem(pendingMutationStorageKey(orderId), JSON.stringify(mutation));
  } catch {
    // The in-memory key still protects retries during this component lifetime.
  }
}

function clearPendingMutation(orderId: string) {
  try {
    window.localStorage.removeItem(pendingMutationStorageKey(orderId));
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

export function OrderStatusAction({ order }: Readonly<{ order: VendorOrder }>) {
  const refreshVendorData = useVendorDataRefresh();
  const idempotencyKey = useRef<string | undefined>(undefined);
  const submissionInFlight = useRef(false);
  const [selected, setSelected] = useState<NextStatus | undefined>(order.allowedNextStatuses[0]);
  const [confirming, setConfirming] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const pending = readPendingMutation(order.id);
    if (!pending) return;
    let body: { status?: NextStatus; trackingCarrier?: string; trackingNumber?: string };
    try {
      body = JSON.parse(pending.requestBody) as typeof body;
    } catch {
      clearPendingMutation(order.id);
      return;
    }
    if (body.status === order.status || pending.sourceStatus !== order.status) {
      clearPendingMutation(order.id);
      return;
    }
    if (!body.status || !order.allowedNextStatuses.includes(body.status)) return;
    let cancelled = false;
    window.queueMicrotask(() => {
      if (cancelled) return;
      idempotencyKey.current = pending.key;
      setSelected(body.status);
      setTrackingCarrier(body.trackingCarrier ?? "");
      setTrackingNumber(body.trackingNumber ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [order.allowedNextStatuses, order.id, order.status]);

  if (order.allowedNextStatuses.length === 0) return null;
  const target =
    selected && order.allowedNextStatuses.includes(selected)
      ? selected
      : order.allowedNextStatuses[0];
  const needsTracking = target === "SHIPPED";
  const canSubmit = Boolean(
    target && (!needsTracking || (trackingNumber.trim() && trackingCarrier.trim())),
  );
  const beginConfirmation = () => {
    setError(undefined);
    setConfirming(true);
  };

  const resetDialog = () => {
    setError(undefined);
  };

  const updateStatus = async () => {
    if (!target || !canSubmit || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const requestBody = JSON.stringify({
        status: target,
        ...(needsTracking
          ? { trackingCarrier: trackingCarrier.trim(), trackingNumber: trackingNumber.trim() }
          : {}),
      });
      const pending = readPendingMutation(order.id);
      if (pending && pending.requestBody !== requestBody) {
        setError(
          "A previous update has an unresolved outcome. Retry its exact values after the order refreshes.",
        );
        await refreshVendorData(["dashboard", "orders"]);
        return;
      }
      const mutationKey = pending?.key ?? idempotencyKey.current ?? globalThis.crypto.randomUUID();
      idempotencyKey.current = mutationKey;
      writePendingMutation(order.id, {
        key: mutationKey,
        requestBody,
        sourceStatus: order.status,
      });
      const response = await fetch(`/api/orders/${order.id}/status`, {
        body: requestBody,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": mutationKey,
          ...(token ? { "X-CSRF-Token": decodeURIComponent(token) } : {}),
        },
        method: "PUT",
      });
      const payload: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const idempotencyStatus = response.headers.get("Idempotency-Status");
        if (
          response.status < 500 &&
          idempotencyStatus !== "ambiguous" &&
          idempotencyStatus !== "in-progress" &&
          idempotencyStatus !== "conflict"
        ) {
          clearPendingMutation(order.id);
          idempotencyKey.current = undefined;
        }
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : "The order status could not be updated.";
        throw new Error(message);
      }
      clearPendingMutation(order.id);
      idempotencyKey.current = undefined;
      setConfirming(false);
      await refreshVendorData(["dashboard", "orders"]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The order status could not be updated.");
      try {
        await refreshVendorData(["dashboard", "orders"]);
      } catch {
        setError("The outcome is unclear. Reload the order before retrying this action.");
      }
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="vendor-order-action">
      {order.allowedNextStatuses.length === 1 ? (
        <Button onClick={beginConfirmation} size="sm" variant="secondary">
          {target ? labels[target] : "Update status"}
        </Button>
      ) : (
        <div className="vendor-order-action__choice">
          <Select
            aria-label="Next order status"
            label="Next status"
            onChange={(event) => setSelected(event.target.value as NextStatus)}
            value={target}
          >
            {order.allowedNextStatuses.map((status) => (
              <option key={status} value={status}>
                {labels[status]}
              </option>
            ))}
          </Select>
          <Button onClick={beginConfirmation} size="sm" variant="secondary">
            Continue
          </Button>
        </div>
      )}
      <Dialog
        description={`Current status: ${order.status.toLowerCase()}. This action cannot be undone from the dashboard.`}
        footer={
          <>
            <Button
              disabled={submitting}
              onClick={() => {
                resetDialog();
                setConfirming(false);
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!canSubmit}
              loading={submitting}
              loadingLabel="Updating order"
              onClick={() => void updateStatus()}
            >
              {target ? labels[target] : "Update status"}
            </Button>
          </>
        }
        onClose={() => {
          if (!submitting) {
            resetDialog();
            setConfirming(false);
          }
        }}
        open={confirming}
        title={target ? labels[target] : "Update order"}
      >
        <div className="vendor-order-action__dialog">
          {needsTracking ? (
            <>
              <Input
                label="Tracking carrier"
                maxLength={100}
                onChange={(event) => setTrackingCarrier(event.target.value)}
                required
                value={trackingCarrier}
              />
              <Input
                label="Tracking number"
                maxLength={100}
                onChange={(event) => setTrackingNumber(event.target.value)}
                required
                value={trackingNumber}
              />
            </>
          ) : null}
          {error ? (
            <p className="vendor-order-action__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
