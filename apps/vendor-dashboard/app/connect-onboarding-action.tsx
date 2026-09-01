"use client";

import { Button } from "@repo/ui";
import { useRef, useState } from "react";

function csrfToken(): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "vendor_csrf_token")
    ?.slice(1)
    .join("=");
}

type OnboardingResult =
  | Readonly<{ kind: "completed" }>
  | Readonly<{ kind: "redirect"; url: string }>;

function onboardingResult(payload: unknown): OnboardingResult | undefined {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    typeof payload.data !== "object" ||
    payload.data === null ||
    !("provider" in payload.data)
  ) {
    return undefined;
  }
  if (
    payload.data.provider === "RAZORPAY" &&
    "completed" in payload.data &&
    payload.data.completed === true
  ) {
    return { kind: "completed" };
  }
  if (
    payload.data.provider !== "STRIPE" ||
    !("url" in payload.data) ||
    typeof payload.data.url !== "string"
  ) {
    return undefined;
  }
  try {
    const url = new URL(payload.data.url);
    return url.origin === "https://connect.stripe.com" && !url.username && !url.password
      ? { kind: "redirect", url: url.toString() }
      : undefined;
  } catch {
    return undefined;
  }
}

export function ConnectOnboardingAction({
  label,
  provider,
}: Readonly<{ label: string; provider: "RAZORPAY" | "STRIPE" }>) {
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const start = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch("/api/connect/onboard", {
        headers: token ? { "X-CSRF-Token": decodeURIComponent(token) } : {},
        method: "POST",
      });
      const payload: unknown = await response.json().catch(() => undefined);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : `${provider === "STRIPE" ? "Stripe Connect" : "Razorpay sandbox"} setup could not be started`;
        throw new Error(message);
      }
      const result = onboardingResult(payload);
      if (!result) throw new Error("Payment provider returned an invalid onboarding response");
      window.location.assign(
        result.kind === "redirect" ? result.url : "/earnings?connect=provider-complete",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Payment provider setup could not be started",
      );
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="vendor-connect-action">
      <Button
        loading={loading}
        loadingLabel={provider === "STRIPE" ? "Opening Stripe" : "Preparing Razorpay"}
        onClick={() => void start()}
      >
        {label}
      </Button>
      {error ? (
        <p className="vendor-connect-action__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
