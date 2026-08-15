"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, ErrorState, Input, Select } from "@repo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEventHandler } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { z } from "zod";
import type { AdminPromoDetail } from "../src/lib/promo-data";

const optionalNonnegative = z.number().nonnegative("Value cannot be negative").optional();
const optionalPositiveInteger = z
  .number()
  .int("Limit must be a whole number")
  .positive("Limit must be a positive integer")
  .optional();
const promoEditorSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters")
      .max(30, "Code must not exceed 30 characters")
      .transform((value) => value.toUpperCase()),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().positive("Discount value must be positive"),
    expiresAt: z.string(),
    isActive: z.boolean(),
    maxDiscount: optionalNonnegative,
    minOrderValue: optionalNonnegative,
    perUserLimit: optionalPositiveInteger,
    usageLimit: optionalPositiveInteger,
  })
  .refine((value) => value.discountType !== "PERCENTAGE" || value.discountValue <= 100, {
    message: "Percentage discount cannot exceed 100",
    path: ["discountValue"],
  });

type PromoEditorValues = z.input<typeof promoEditorSchema>;
type PromoPayload = Readonly<{
  code?: string;
  discountType?: "FIXED" | "PERCENTAGE";
  discountValue?: number;
  expiresAt?: null | string;
  isActive?: boolean;
  maxDiscount?: null | number;
  minOrderValue?: null | number;
  perUserLimit?: null | number;
  usageLimit?: null | number;
}>;
type ApiPayload = Readonly<{
  errors?: readonly Readonly<{ field?: string; message?: string; path?: readonly PropertyKey[] }>[];
  message?: string;
}>;
const formFields = new Set([
  "code",
  "discountType",
  "discountValue",
  "expiresAt",
  "isActive",
  "maxDiscount",
  "minOrderValue",
  "perUserLimit",
  "usageLimit",
]);

function csrfToken(): string | undefined {
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : undefined;
}

function dateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function optionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
}

export function PromoForm({
  error,
  promo,
}: Readonly<{ error?: string; promo?: AdminPromoDetail }>) {
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const [formError, setFormError] = useState<string>();
  const [renderedAt] = useState(() => Date.now());
  const editing = Boolean(promo);
  const {
    control,
    formState: { dirtyFields, errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setError,
  } = useForm<PromoEditorValues>({
    defaultValues: {
      code: promo?.code ?? "",
      discountType: promo?.discountType ?? "PERCENTAGE",
      discountValue: promo ? Number(promo.discountValue) : undefined,
      expiresAt: dateTimeLocal(promo?.expiresAt ?? null),
      isActive: promo?.isActive ?? true,
      maxDiscount: promo?.maxDiscount == null ? undefined : Number(promo.maxDiscount),
      minOrderValue: promo?.minOrderValue == null ? undefined : Number(promo.minOrderValue),
      perUserLimit: promo?.perUserLimit ?? undefined,
      usageLimit: promo?.usageLimit ?? undefined,
    },
    resolver: zodResolver(promoEditorSchema),
  });
  const discountType = useWatch({ control, name: "discountType" });

  if (error) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/promos">
            Back to promo codes
          </Link>
        }
        description={error}
        title="Promo editor unavailable"
      />
    );
  }

  const submit = handleSubmit(async (values) => {
    setFormError(undefined);
    const normalized = promoEditorSchema.parse(values);
    const all: PromoPayload = {
      code: normalized.code,
      discountType: normalized.discountType,
      discountValue: normalized.discountValue,
      ...(normalized.expiresAt
        ? { expiresAt: new Date(normalized.expiresAt).toISOString() }
        : editing
          ? { expiresAt: null }
          : {}),
      isActive: normalized.isActive,
      ...(normalized.maxDiscount !== undefined
        ? { maxDiscount: normalized.maxDiscount }
        : editing
          ? { maxDiscount: null }
          : {}),
      ...(normalized.minOrderValue !== undefined
        ? { minOrderValue: normalized.minOrderValue }
        : editing
          ? { minOrderValue: null }
          : {}),
      ...(normalized.perUserLimit !== undefined
        ? { perUserLimit: normalized.perUserLimit }
        : editing
          ? { perUserLimit: null }
          : {}),
      ...(normalized.usageLimit !== undefined
        ? { usageLimit: normalized.usageLimit }
        : editing
          ? { usageLimit: null }
          : {}),
    };
    const payload = editing
      ? (Object.fromEntries(
          Object.entries(all).filter(([field]) => dirtyFields[field as keyof PromoEditorValues]),
        ) as PromoPayload)
      : all;
    if (editing && Object.keys(payload).length === 0) {
      setFormError("Change at least one field before saving");
      return;
    }
    try {
      const token = csrfToken();
      const response = await fetch(promo ? `/api/promos/${promo.id}` : "/api/promos", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        method: promo ? "PUT" : "POST",
      });
      const responsePayload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok) {
        for (const issue of responsePayload.errors ?? []) {
          const field = issue.field ?? issue.path?.map(String).join(".");
          if (field && formFields.has(field)) {
            setError(field as FieldPath<PromoEditorValues>, {
              message: issue.message ?? "Invalid value",
              type: "server",
            });
          }
        }
        throw new Error(responsePayload.message || "Promo code could not be saved");
      }
      router.push("/promos");
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Promo code could not be saved");
    }
  });

  const guardedSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    if (submissionInFlight.current) {
      event.preventDefault();
      return;
    }
    const values = getValues();
    const expiryChanged = !editing || dirtyFields.expiresAt;
    if (values.expiresAt && expiryChanged && new Date(values.expiresAt).getTime() <= Date.now()) {
      event.preventDefault();
      setError("expiresAt", { message: "Expiry date must be in the future", type: "validate" });
      return;
    }
    submissionInFlight.current = true;
    try {
      await submit(event);
    } finally {
      submissionInFlight.current = false;
    }
  };

  const numberRegistration = (
    field: "maxDiscount" | "minOrderValue" | "perUserLimit" | "usageLimit",
  ) => register(field, { setValueAs: optionalNumber });

  return (
    <form className="admin-promo-form" noValidate onSubmit={guardedSubmit}>
      <header className="admin-promo-form__header">
        <div>
          <Link href="/promos">← Promo codes</Link>
          <p>Campaign controls</p>
          <h1>{editing ? `Edit ${promo?.code}` : "Create promo code"}</h1>
          <p>Discount, usage, expiry, and activation rules match the marketplace API.</p>
        </div>
      </header>
      <Card>
        <CardContent>
          <div className="admin-promo-form__grid">
            <Input
              error={errors.code?.message}
              label="Promo code"
              maxLength={30}
              placeholder="SUMMER20"
              required
              {...register("code")}
            />
            <Select
              error={errors.discountType?.message}
              label="Discount type"
              required
              {...register("discountType")}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </Select>
            <Input
              error={errors.discountValue?.message}
              hint={discountType === "PERCENTAGE" ? "Between 0 and 100%." : "Amount in INR."}
              label="Discount value"
              min="0.01"
              required
              step="0.01"
              type="number"
              {...register("discountValue", { valueAsNumber: true })}
            />
            <Input
              error={errors.minOrderValue?.message}
              label="Minimum order value"
              min="0"
              step="0.01"
              type="number"
              {...numberRegistration("minOrderValue")}
            />
            <Input
              disabled={discountType !== "PERCENTAGE"}
              error={errors.maxDiscount?.message}
              hint="Optional cap for percentage discounts."
              label="Maximum discount"
              min="0"
              step="0.01"
              type="number"
              {...numberRegistration("maxDiscount")}
            />
            <Input
              error={errors.usageLimit?.message}
              label="Total usage limit"
              min="1"
              step="1"
              type="number"
              {...numberRegistration("usageLimit")}
            />
            <Input
              error={errors.perUserLimit?.message}
              label="Per-user limit"
              min="1"
              step="1"
              type="number"
              {...numberRegistration("perUserLimit")}
            />
            <Input
              error={errors.expiresAt?.message}
              hint={
                editing && promo?.expiresAt && new Date(promo.expiresAt).getTime() <= renderedAt
                  ? "This promo has expired. Leave unchanged or choose a future expiry."
                  : "Optional; new expiry dates must be in the future."
              }
              label="Expires at"
              type="datetime-local"
              {...register("expiresAt")}
            />
            <label className="admin-promo-form__checkbox">
              <input type="checkbox" {...register("isActive")} />
              <span>
                <strong>Active</strong>
                <small>Inactive promos cannot be redeemed. Activation remains manual.</small>
              </span>
            </label>
          </div>
        </CardContent>
      </Card>
      {formError ? (
        <p className="admin-promo-error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="admin-promo-form__actions">
        <Link className="ui-button ui-button--ghost ui-button--md" href="/promos">
          Cancel
        </Link>
        <Button loading={isSubmitting} loadingLabel="Saving promo code" type="submit">
          Save promo code
        </Button>
      </div>
    </form>
  );
}
