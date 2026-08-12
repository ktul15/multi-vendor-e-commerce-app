"use client";

import { Button, Dialog, Input, Select } from "@repo/ui";
import { useRef, useState } from "react";
import type { VendorOrder } from "../src/lib/order-data";
import { useVendorDataRefresh } from "./vendor-data-coherence";

type NextStatus = VendorOrder["allowedNextStatuses"][number];

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

export function OrderStatusAction({ order }: Readonly<{ order: VendorOrder }>) {
  const refreshVendorData = useVendorDataRefresh();
  const submissionInFlight = useRef(false);
  const [selected, setSelected] = useState<NextStatus | undefined>(order.allowedNextStatuses[0]);
  const [confirming, setConfirming] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

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

  const updateStatus = async () => {
    if (!target || !canSubmit || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch(`/api/orders/${order.id}/status`, {
        body: JSON.stringify({
          status: target,
          ...(needsTracking
            ? { trackingCarrier: trackingCarrier.trim(), trackingNumber: trackingNumber.trim() }
            : {}),
        }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": decodeURIComponent(token) } : {}),
        },
        method: "PUT",
      });
      const payload: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : "The order status could not be updated.";
        throw new Error(message);
      }
      setConfirming(false);
      await refreshVendorData(["dashboard", "orders"]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The order status could not be updated.");
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
            <Button disabled={submitting} onClick={() => setConfirming(false)} variant="ghost">
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
        onClose={() => !submitting && setConfirming(false)}
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
