"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { normalizeApiError } from "@repo/api-client";
import { postLoginReturnPath } from "@repo/auth";
import { applyApiFieldErrors } from "@repo/schemas";
import { Button, Card, CardContent, Input } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import { useForm } from "react-hook-form";
import { vendorLoginSchema, vendorRegistrationSchema } from "../../src/lib/auth-forms";
import type { VendorLoginValues, VendorRegistrationValues } from "../../src/lib/auth-forms";
import { publishVendorDataChange } from "../../src/lib/vendor-data-sync";

type AuthMode = "login" | "register";

async function postCredentials(path: string, values: unknown): Promise<void> {
  const response = await fetch(path, {
    body: JSON.stringify(values),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw normalizeApiError(payload, response.status);
}

function LoginForm({ onSuccess }: Readonly<{ onSuccess: () => void }>) {
  const [formError, setFormError] = useState<string>();
  const submissionInFlight = useRef(false);
  const form = useForm<VendorLoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(vendorLoginSchema),
  });

  const submit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await postCredentials("/api/auth/login", values);
      onSuccess();
    } catch (error) {
      const normalized = normalizeApiError(error);
      setFormError(
        applyApiFieldErrors({
          error: normalized,
          fields: ["email", "password"],
          setError: form.setError,
        }),
      );
    }
  });

  const guardedSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    if (submissionInFlight.current) {
      event.preventDefault();
      return;
    }
    submissionInFlight.current = true;
    try {
      await submit(event);
    } finally {
      submissionInFlight.current = false;
    }
  };

  return (
    <form className="vendor-auth__form" noValidate onSubmit={guardedSubmit}>
      <Input
        autoComplete="email"
        error={form.formState.errors.email?.message}
        label="Email address"
        required
        type="email"
        {...form.register("email")}
      />
      <Input
        autoComplete="current-password"
        error={form.formState.errors.password?.message}
        label="Password"
        required
        type="password"
        {...form.register("password")}
      />
      {formError ? (
        <p className="vendor-auth__error" role="alert">
          {formError}
        </p>
      ) : null}
      <Button
        loading={form.formState.isSubmitting}
        loadingLabel="Signing in"
        size="lg"
        type="submit"
      >
        Sign in
      </Button>
    </form>
  );
}

function RegistrationForm({ onSuccess }: Readonly<{ onSuccess: () => void }>) {
  const [formError, setFormError] = useState<string>();
  const submissionInFlight = useRef(false);
  const form = useForm<VendorRegistrationValues>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: "",
      storeName: "",
    },
    resolver: zodResolver(vendorRegistrationSchema),
  });

  const submit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await postCredentials("/api/auth/register", values);
      onSuccess();
    } catch (error) {
      const normalized = normalizeApiError(error);
      setFormError(
        applyApiFieldErrors({
          error: normalized,
          fields: ["name", "email", "storeName", "password", "confirmPassword"],
          setError: form.setError,
        }),
      );
    }
  });

  const guardedSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    if (submissionInFlight.current) {
      event.preventDefault();
      return;
    }
    submissionInFlight.current = true;
    try {
      await submit(event);
    } finally {
      submissionInFlight.current = false;
    }
  };

  return (
    <form className="vendor-auth__form" noValidate onSubmit={guardedSubmit}>
      <Input
        autoComplete="name"
        error={form.formState.errors.name?.message}
        label="Your name"
        required
        {...form.register("name")}
      />
      <Input
        autoComplete="organization"
        error={form.formState.errors.storeName?.message}
        label="Store name"
        required
        {...form.register("storeName")}
      />
      <Input
        autoComplete="email"
        error={form.formState.errors.email?.message}
        label="Email address"
        required
        type="email"
        {...form.register("email")}
      />
      <Input
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
        hint="Use 6–100 characters."
        label="Password"
        required
        type="password"
        {...form.register("password")}
      />
      <Input
        autoComplete="new-password"
        error={form.formState.errors.confirmPassword?.message}
        label="Confirm password"
        required
        type="password"
        {...form.register("confirmPassword")}
      />
      {formError ? (
        <p className="vendor-auth__error" role="alert">
          {formError}
        </p>
      ) : null}
      <Button
        loading={form.formState.isSubmitting}
        loadingLabel="Creating vendor account"
        size="lg"
        type="submit"
      >
        Create vendor account
      </Button>
    </form>
  );
}

export function VendorAuthPanel({
  initialMode,
  returnTo,
}: Readonly<{ initialMode: AuthMode; returnTo: string }>) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [restoring, setRestoring] = useState(true);
  const safeDestination = postLoginReturnPath(returnTo);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (response.ok) {
          router.replace(safeDestination);
          router.refresh();
        }
      })
      .catch(() => undefined)
      .finally(() => setRestoring(false));
    return () => controller.abort();
  }, [router, safeDestination]);

  const complete = () => {
    publishVendorDataChange(["dashboard", "inventory", "orders", "profile", "session"]);
    router.replace(safeDestination);
    router.refresh();
  };

  return (
    <main className="vendor-auth">
      <section aria-labelledby="vendor-auth-heading" className="vendor-auth__intro">
        <p className="vendor-auth__eyebrow">Vendor Hub</p>
        <h1 id="vendor-auth-heading">Run your storefront with confidence.</h1>
        <p>
          Manage inventory, fulfil orders, follow earnings, and keep your store profile current from
          one focused workspace.
        </p>
      </section>
      <Card className="vendor-auth__card">
        <CardContent>
          <div aria-label="Authentication mode" className="vendor-auth__tabs" role="tablist">
            <button
              aria-selected={mode === "login"}
              onClick={() => setMode("login")}
              role="tab"
              type="button"
            >
              Sign in
            </button>
            <button
              aria-selected={mode === "register"}
              onClick={() => setMode("register")}
              role="tab"
              type="button"
            >
              Create account
            </button>
          </div>
          <div className="vendor-auth__heading">
            <h2>{mode === "login" ? "Welcome back" : "Start selling"}</h2>
            <p>
              {mode === "login"
                ? "Sign in with your vendor account."
                : "Create a vendor account for your store."}
            </p>
          </div>
          {restoring ? (
            <p aria-live="polite" className="vendor-auth__restoring">
              Checking your session…
            </p>
          ) : mode === "login" ? (
            <LoginForm onSuccess={complete} />
          ) : (
            <RegistrationForm onSuccess={complete} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
