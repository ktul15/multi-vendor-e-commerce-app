"use client";

import { Button, Card, CardContent, ErrorState, Input } from "@repo/ui";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { AdminBanner } from "../src/lib/banner-data";

const MAX = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
type Payload = {
  errors?: readonly { field?: string; message?: string; path?: readonly (number | string)[] }[];
  message?: string;
};
function csrf() {
  const raw = document.cookie
    .split(";")
    .map((x) => x.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
  return raw ? decodeURIComponent(raw) : undefined;
}

export function uploadBanner(
  url: string,
  method: "POST" | "PUT",
  body: FormData,
  onProgress: (value: number) => void,
): Promise<Payload> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    const token = csrf();
    if (token) request.setRequestHeader("X-CSRF-Token", token);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      let payload: Payload = {};
      try {
        payload = JSON.parse(request.responseText) as Payload;
      } catch {
        /* empty */
      }
      if (request.status >= 200 && request.status < 300) resolve(payload);
      else
        reject(
          Object.assign(new Error(payload.message ?? "Banner could not be saved"), { payload }),
        );
    });
    request.addEventListener("error", () =>
      reject(new Error("Banner upload failed. Check your connection and retry.")),
    );
    request.send(body);
  });
}

export function BannerForm({ banner, error }: Readonly<{ banner?: AdminBanner; error?: string }>) {
  const router = useRouter();
  const editing = Boolean(banner);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrl = useRef<string | undefined>(undefined);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState(banner?.imageUrl);
  const [fileError, setFileError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);
  useEffect(
    () => () => {
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    },
    [],
  );
  if (error)
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/banners">
            Back to banners
          </Link>
        }
        description={error}
        title="Banner editor unavailable"
      />
    );
  const clearSelection = () => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = undefined;
    setFile(undefined);
    setPreview(banner?.imageUrl);
  };
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    setFileError(undefined);
    if (!next) return;
    if (!TYPES.has(next.type)) {
      clearSelection();
      setFileError("Choose a JPEG, PNG, or WebP image");
      event.target.value = "";
      return;
    }
    if (next.size > MAX) {
      clearSelection();
      setFileError("Image must be 5 MB or smaller");
      event.target.value = "";
      return;
    }
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = URL.createObjectURL(next);
    setFile(next);
    setPreview(previewObjectUrl.current);
    setFailed(false);
  };
  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setFormError(undefined);
    setFieldErrors({});
    const form =
      event?.currentTarget ?? document.querySelector<HTMLFormElement>(".admin-banner-form");
    if (!form) return;
    const title = form.elements.namedItem("title") as HTMLInputElement;
    const link = form.elements.namedItem("linkUrl") as HTMLInputElement;
    const position = form.elements.namedItem("position") as HTMLInputElement;
    const active = form.elements.namedItem("isActive") as HTMLInputElement;
    const errors: Record<string, string> = {};
    if (!title.value.trim()) errors.title = "Title is required";
    if (title.value.trim().length > 200) errors.title = "Title must be 200 characters or fewer";
    if (link.value && !URL.canParse(link.value)) errors.linkUrl = "Enter an absolute URL";
    if (!/^\d+$/.test(position.value) || Number(position.value) < 0)
      errors.position = "Position must be a non-negative whole number";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    if (!editing && !file) {
      setFileError("Banner image is required");
      fileRef.current?.focus();
      return;
    }
    const data = new FormData(form);
    data.set("title", title.value.trim());
    data.set("linkUrl", link.value.trim());
    data.set("isActive", String(active.checked));
    if (file) data.set("image", file);
    else data.delete("image");
    setProgress(0);
    setFailed(false);
    try {
      await uploadBanner(
        banner ? `/api/banners/${banner.id}` : "/api/banners",
        banner ? "PUT" : "POST",
        data,
        setProgress,
      );
      router.push("/banners");
      router.refresh();
    } catch (cause) {
      const failure = cause as Error & { payload?: Payload };
      const mapped: Record<string, string> = {};
      for (const issue of failure.payload?.errors ?? []) {
        const field = issue.field ?? issue.path?.map(String).join(".");
        if (field && issue.message) mapped[field] = issue.message;
      }
      setFieldErrors(mapped);
      setFormError(failure.message);
      setFailed(true);
    } finally {
      setProgress(undefined);
    }
  };
  return (
    <form className="admin-banner-form" noValidate onSubmit={(event) => void submit(event)}>
      <header>
        <div>
          <Link href="/banners">← Banners</Link>
          <p>Storefront merchandising</p>
          <h1>{editing ? `Edit ${banner?.title}` : "Create banner"}</h1>
          <p>Activation is immediate. Created and updated dates are maintained by the server.</p>
        </div>
      </header>
      <Card>
        <CardContent>
          <div className="admin-banner-form__grid">
            <div className="admin-banner-form__fields">
              <Input
                defaultValue={banner?.title}
                error={fieldErrors.title}
                label="Title"
                maxLength={200}
                name="title"
                required
              />
              <Input
                defaultValue={banner?.linkUrl ?? ""}
                error={fieldErrors.linkUrl}
                label="Destination URL (optional)"
                name="linkUrl"
                placeholder="https://example.com/sale"
                type="url"
              />
              <Input
                defaultValue={banner?.position ?? 0}
                error={fieldErrors.position}
                label="Position"
                min={0}
                name="position"
                required
                step={1}
                type="number"
              />
              <label className="admin-banner-checkbox">
                <input
                  defaultChecked={banner?.isActive ?? true}
                  name="isActive"
                  type="checkbox"
                  value="true"
                />
                <span>Active on storefront immediately</span>
              </label>
            </div>
            <div className="admin-banner-media">
              <label htmlFor="banner-image">
                Banner image{editing ? " (optional replacement)" : ""}
              </label>
              <input
                accept="image/jpeg,image/png,image/webp"
                id="banner-image"
                name="image"
                onChange={choose}
                ref={fileRef}
                type="file"
              />
              {fileError ? <small className="admin-banner-field-error">{fileError}</small> : null}
              <small>JPEG, PNG, or WebP; maximum 5 MB.</small>
              {preview ? (
                <Image alt="Banner preview" height={420} src={preview} unoptimized width={1280} />
              ) : (
                <div className="admin-banner-media__empty">Select an image to preview it here.</div>
              )}
            </div>
          </div>
          {progress !== undefined ? (
            <div className="admin-banner-progress" role="status">
              <progress aria-label="Uploading banner image" max={100} value={progress} />
              <span>Uploading… {progress}%</span>
            </div>
          ) : null}
          {formError ? (
            <p className="admin-banner-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="admin-banner-form__actions">
            <Link className="ui-button ui-button--secondary ui-button--md" href="/banners">
              Cancel
            </Link>
            {failed ? (
              <Button onClick={() => void submit()} type="button" variant="secondary">
                Retry upload
              </Button>
            ) : null}
            <Button disabled={progress !== undefined} type="submit">
              {editing ? "Save banner" : "Create banner"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
