"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import { useForm } from "react-hook-form";
import type { VendorProfile } from "../src/lib/vendor-profile-api";
import { canEditStoreProfile } from "../src/lib/vendor-access";
import { storeImageError, storeProfileSchema } from "../src/lib/store-profile-schema";
import type { StoreProfileValues } from "../src/lib/store-profile-schema";
import { useVendorDataRefresh } from "./vendor-data-coherence";

type MediaField = "banner" | "logo";
type SelectedMedia = Readonly<{ file: File; preview: string }>;
type ApiPayload = Readonly<{
  data?: VendorProfile;
  errors?: readonly Readonly<{ field?: string; message?: string }>[];
  message?: string;
}>;

function csrfToken(): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "vendor_csrf_token")
    ?.slice(1)
    .join("=");
}

function values(profile: VendorProfile): StoreProfileValues {
  return { description: profile.description ?? "", storeName: profile.storeName };
}

const statusTone = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  SUSPENDED: "danger",
} as const;

export function StoreProfileForm({ initialProfile }: Readonly<{ initialProfile: VendorProfile }>) {
  const router = useRouter();
  const refreshVendorData = useVendorDataRefresh();
  const [profile, setProfile] = useState(initialProfile);
  const [media, setMedia] = useState<Partial<Record<MediaField, SelectedMedia>>>({});
  const [mediaErrors, setMediaErrors] = useState<Partial<Record<MediaField, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const mediaAtUnmount = useRef(media);
  const submissionInFlight = useRef(false);
  const editable = canEditStoreProfile(profile.status);
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<StoreProfileValues>({
    defaultValues: values(initialProfile),
    resolver: zodResolver(storeProfileSchema),
  });

  useEffect(() => {
    mediaAtUnmount.current = media;
  }, [media]);
  useEffect(
    () => () => {
      for (const selected of Object.values(mediaAtUnmount.current)) {
        URL.revokeObjectURL(selected.preview);
      }
    },
    [],
  );

  const clearMedia = () => {
    for (const selected of Object.values(media)) URL.revokeObjectURL(selected.preview);
    setMedia({});
    setMediaErrors({});
    setFileInputKey((key) => key + 1);
  };

  const chooseMedia = (field: MediaField, file?: File) => {
    if (!file) return;
    setSuccess(undefined);
    const validation = storeImageError(file);
    if (validation) {
      setMediaErrors((current) => ({ ...current, [field]: validation }));
      return;
    }
    if (media[field]) URL.revokeObjectURL(media[field]!.preview);
    setMedia((current) => ({
      ...current,
      [field]: { file, preview: URL.createObjectURL(file) },
    }));
    setMediaErrors((current) => ({ ...current, [field]: undefined }));
  };

  const applyProfile = (next: VendorProfile, message: string) => {
    setProfile(next);
    reset(values(next));
    clearMedia();
    setFormError(undefined);
    setSuccess(message);
  };

  const refresh = async () => {
    if ((isDirty || Object.keys(media).length > 0) && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    setRefreshing(true);
    setFormError(undefined);
    setSuccess(undefined);
    try {
      const response = await fetch("/api/vendor-profile", { cache: "no-store" });
      const payload = (await response.json().catch(() => undefined)) as ApiPayload | undefined;
      if (response.status === 401) {
        router.replace("/login?returnTo=%2Fstore");
        router.refresh();
        return;
      }
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message ?? "Store profile could not be refreshed");
      }
      applyProfile(payload.data, "Store profile refreshed.");
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Store profile could not be refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  const submit = handleSubmit(async (submitted) => {
    setFormError(undefined);
    setSuccess(undefined);
    const body = new FormData();
    body.set("storeName", submitted.storeName);
    body.set("description", submitted.description);
    if (media.logo) body.set("logo", media.logo.file);
    if (media.banner) body.set("banner", media.banner.file);
    const token = csrfToken();

    try {
      const response = await fetch("/api/vendor-profile", {
        body,
        headers: token ? { "X-CSRF-Token": decodeURIComponent(token) } : {},
        method: "PUT",
      });
      const payload = (await response.json().catch(() => undefined)) as ApiPayload | undefined;
      if (response.status === 401) {
        router.replace("/login?returnTo=%2Fstore");
        router.refresh();
        return;
      }
      if (!response.ok || !payload?.data) {
        for (const error of payload?.errors ?? []) {
          if (error.field === "storeName" || error.field === "description") {
            setError(error.field, { message: error.message ?? "Invalid value", type: "server" });
          } else if (error.field === "logo" || error.field === "banner") {
            setMediaErrors((current) => ({
              ...current,
              [error.field as MediaField]: error.message ?? "Invalid image",
            }));
          }
        }
        throw new Error(payload?.message ?? "Store profile could not be saved");
      }
      applyProfile({ ...profile, ...payload.data }, "Store profile updated.");
      await refreshVendorData(["dashboard", "profile"]);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Store profile could not be saved");
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

  const mediaField = (field: MediaField, label: string, currentUrl?: string | null) => {
    const selected = media[field];
    const source = selected?.preview ?? currentUrl;
    return (
      <div className="vendor-store-profile__media-field">
        <div className={`vendor-store-profile__preview vendor-store-profile__preview--${field}`}>
          {source ? (
            <Image
              alt={`${label} preview`}
              decoding="async"
              fill
              loading="lazy"
              sizes={field === "logo" ? "10rem" : "32rem"}
              src={source}
              unoptimized
            />
          ) : (
            <span>No {label.toLowerCase()} uploaded</span>
          )}
        </div>
        <div>
          <strong>{label}</strong>
          <p>JPEG, PNG, or WebP. Maximum 5 MB.</p>
          {editable ? (
            <label className="ui-button ui-button--secondary ui-button--sm vendor-store-profile__file-label">
              {currentUrl ? `Replace ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
              <input
                accept="image/jpeg,image/png,image/webp"
                className="vendor-store-profile__file-input"
                key={`${field}-${fileInputKey}`}
                onChange={(event) => chooseMedia(field, event.target.files?.[0])}
                type="file"
              />
            </label>
          ) : null}
          {selected ? <small>{selected.file.name} selected</small> : null}
          {mediaErrors[field] ? (
            <p className="vendor-store-profile__field-error" role="alert">
              {mediaErrors[field]}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section aria-labelledby="store-profile-title" className="vendor-store-profile">
      <header className="vendor-store-profile__header">
        <div>
          <p className="vendor-store-profile__eyebrow">Public storefront</p>
          <h1 id="store-profile-title">Store profile</h1>
          <p>Manage the name, description, and imagery customers see.</p>
        </div>
        <div className="vendor-store-profile__header-actions">
          <Badge tone={statusTone[profile.status]}>{profile.status.toLowerCase()}</Badge>
          <Button
            loading={refreshing}
            loadingLabel="Refreshing"
            onClick={() => void refresh()}
            variant="secondary"
          >
            Refresh
          </Button>
        </div>
      </header>

      {!editable ? (
        <p className="vendor-store-profile__readonly" role="status">
          This profile is read-only while your vendor status is {profile.status.toLowerCase()}.
        </p>
      ) : null}
      {success ? (
        <p className="vendor-store-profile__success" role="status">
          {success}
        </p>
      ) : null}
      {formError ? (
        <p className="vendor-store-profile__error" role="alert">
          {formError}
        </p>
      ) : null}

      <form onSubmit={guardedSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Store details</CardTitle>
          </CardHeader>
          <CardContent className="vendor-store-profile__details">
            <Input
              disabled={!editable}
              error={errors.storeName?.message}
              label="Store name"
              maxLength={100}
              required
              {...register("storeName")}
            />
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="store-description">
                Description
              </label>
              <textarea
                aria-describedby="store-description-message"
                aria-invalid={Boolean(errors.description)}
                className="ui-field__control vendor-store-profile__textarea"
                disabled={!editable}
                id="store-description"
                maxLength={1000}
                {...register("description")}
              />
              <p
                className={`ui-field__message${errors.description ? " ui-field__message--error" : ""}`}
                id="store-description-message"
              >
                {errors.description?.message ?? "Up to 1,000 characters."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Store imagery</CardTitle>
          </CardHeader>
          <CardContent className="vendor-store-profile__media">
            {mediaField("logo", "Logo", profile.storeLogo)}
            {mediaField("banner", "Banner", profile.storeBanner)}
          </CardContent>
        </Card>

        {editable ? (
          <div className="vendor-store-profile__actions">
            <Button
              disabled={
                (!isDirty && Object.keys(media).length === 0) ||
                Object.values(mediaErrors).some(Boolean)
              }
              loading={isSubmitting}
              loadingLabel="Saving changes"
              type="submit"
            >
              Save changes
            </Button>
          </div>
        ) : null}
      </form>
    </section>
  );
}

export function StoreProfileUnavailable() {
  const router = useRouter();
  return (
    <section className="vendor-store-profile vendor-store-profile--unavailable">
      <h1>Store profile</h1>
      <p role="alert">
        Your store profile could not be loaded. Check your connection and try again.
      </p>
      <Button onClick={() => router.refresh()} variant="secondary">
        Try again
      </Button>
    </section>
  );
}
