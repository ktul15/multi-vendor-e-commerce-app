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
import { adminLoginSchema } from "../../src/lib/auth-forms";
import type { AdminLoginValues } from "../../src/lib/auth-forms";

async function postCredentials(values: AdminLoginValues): Promise<void> {
  const response = await fetch("/api/auth/login", {
    body: JSON.stringify(values),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw normalizeApiError(payload, response.status);
}

export function AdminLoginPanel({ returnTo }: Readonly<{ returnTo: string }>) {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const [restoring, setRestoring] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const submissionInFlight = useRef(false);
  const destination = postLoginReturnPath(returnTo);
  const form = useForm<AdminLoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(adminLoginSchema),
  });

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (response.ok) {
          router.replace(destination);
          router.refresh();
        }
      })
      .catch(() => undefined)
      .finally(() => setRestoring(false));
    return () => controller.abort();
  }, [destination, router]);

  const submit = form.handleSubmit(async (values) => {
    setFormError(undefined);
    try {
      await postCredentials(values);
      router.replace(destination);
      router.refresh();
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
    <main className="admin-auth">
      <section aria-labelledby="admin-auth-title" className="admin-auth__intro">
        <p className="admin-auth__eyebrow">Marketplace operations</p>
        <h1 id="admin-auth-title">Admin Console</h1>
        <p>Moderate the marketplace, support vendors, and monitor platform operations.</p>
      </section>
      <Card className="admin-auth__card">
        <CardContent>
          <header className="admin-auth__heading">
            <h2>Sign in</h2>
            <p>Use an administrator account to continue.</p>
          </header>
          {restoring ? (
            <p aria-live="polite" className="admin-auth__restoring">
              Checking your session…
            </p>
          ) : (
            <form className="admin-auth__form" noValidate onSubmit={guardedSubmit}>
              <Input
                autoComplete="email"
                error={form.formState.errors.email?.message}
                label="Email address"
                required
                type="email"
                {...form.register("email")}
              />
              <div className="admin-auth__password">
                <Input
                  autoComplete="current-password"
                  error={form.formState.errors.password?.message}
                  label="Password"
                  required
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                />
                <Button
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  size="sm"
                  variant="ghost"
                >
                  {showPassword ? "Hide password" : "Show password"}
                </Button>
              </div>
              {formError ? (
                <p className="admin-auth__error" role="alert">
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
          )}
        </CardContent>
      </Card>
    </main>
  );
}
