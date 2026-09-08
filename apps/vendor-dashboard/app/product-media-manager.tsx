"use client";

import { Button } from "@repo/ui";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ProductMedia } from "../src/lib/product-data";

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PendingProductImage = Readonly<{
  error?: string;
  file: File;
  id: string;
  mediaId?: string;
  previewUrl: string;
  status: "failed" | "pending" | "uploading";
}>;

function move<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  const destination = index + direction;
  if (destination < 0 || destination >= next.length) return next;
  [next[index], next[destination]] = [next[destination]!, next[index]!];
  return next;
}

function previewUrl(file: File) {
  return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
}

let pendingSequence = 0;
function pendingImage(file: File, mediaId?: string): PendingProductImage {
  pendingSequence += 1;
  return {
    file,
    id: `product-image-${pendingSequence}`,
    mediaId,
    previewUrl: previewUrl(file),
    status: "pending",
  };
}

function validationMessage(file: File): string | undefined {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) return "Each image must be 5 MB or smaller.";
}

export function ProductMediaManager({
  disabled = false,
  media,
  onMediaChange,
  onPendingChange,
  onRetry,
  pending,
}: Readonly<{
  disabled?: boolean;
  media: readonly ProductMedia[];
  onMediaChange: (media: ProductMedia[]) => void;
  onPendingChange: (pending: PendingProductImage[]) => void;
  onRetry: (id: string) => void;
  pending: readonly PendingProductImage[];
}>) {
  const inputId = useId();
  const [selectionError, setSelectionError] = useState<string>();
  const pendingAtUnmount = useRef(pending);
  useEffect(() => {
    pendingAtUnmount.current = pending;
  }, [pending]);
  useEffect(
    () => () => {
      for (const item of pendingAtUnmount.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );
  const additions = pending.filter((item) => !item.mediaId);
  const replacements = new Map(
    pending.flatMap((item) => (item.mediaId ? [[item.mediaId, item] as const] : [])),
  );

  const addFiles = (files: FileList | readonly File[]) => {
    setSelectionError(undefined);
    const selected = Array.from(files);
    const invalid = selected.map(validationMessage).find(Boolean);
    if (invalid) {
      setSelectionError(invalid);
      return;
    }
    const available = MAX_PRODUCT_IMAGES - media.length - additions.length;
    if (selected.length > available) {
      setSelectionError(
        `You can add ${Math.max(available, 0)} more image${available === 1 ? "" : "s"}.`,
      );
      return;
    }
    onPendingChange([...pending, ...selected.map((file) => pendingImage(file))]);
  };

  const replace = (mediaId: string, file?: File) => {
    if (!file) return;
    setSelectionError(undefined);
    const invalid = validationMessage(file);
    if (invalid) {
      setSelectionError(invalid);
      return;
    }
    const previous = replacements.get(mediaId);
    if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
    onPendingChange([
      ...pending.filter((item) => item.mediaId !== mediaId),
      pendingImage(file, mediaId),
    ]);
  };

  const removePending = (id: string) => {
    const item = pending.find((candidate) => candidate.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    onPendingChange(pending.filter((candidate) => candidate.id !== id));
  };

  return (
    <section aria-describedby={`${inputId}-help`} aria-labelledby={`${inputId}-title`}>
      <h3 className="vendor-product-media__title" id={`${inputId}-title`}>
        Product images
      </h3>
      <p className="vendor-product-form__hint" id={`${inputId}-help`}>
        Add up to five JPEG, PNG, or WebP images, no larger than 5 MB each. Images are saved in the
        order shown.
      </p>

      <div className="vendor-product-media__grid">
        {media.map((item, index) => {
          const replacement = replacements.get(item.id);
          return (
            <article className="vendor-product-media__item" key={item.id}>
              <Image
                alt={`Product image ${index + 1}`}
                decoding="async"
                height={240}
                loading="lazy"
                sizes="(max-width: 48rem) 100vw, (max-width: 80rem) 50vw, 20rem"
                src={replacement?.previewUrl || item.url}
                unoptimized
                width={320}
              />
              <div>
                <strong>Image {index + 1}</strong>
                {replacement ? <small>Replacement ready to upload</small> : <small>Saved</small>}
              </div>
              {replacement?.status === "uploading" ? (
                <progress aria-label={`Uploading replacement for image ${index + 1}`} />
              ) : null}
              {replacement?.status === "failed" ? (
                <p className="vendor-product-form__error" role="alert">
                  {replacement.error}
                </p>
              ) : null}
              <div className="vendor-product-media__actions">
                <Button
                  aria-label={`Move image ${index + 1} earlier`}
                  disabled={disabled || index === 0}
                  onClick={() => onMediaChange(move(media, index, -1))}
                  variant="ghost"
                >
                  Earlier
                </Button>
                <Button
                  aria-label={`Move image ${index + 1} later`}
                  disabled={disabled || index === media.length - 1}
                  onClick={() => onMediaChange(move(media, index, 1))}
                  variant="ghost"
                >
                  Later
                </Button>
                <label
                  className={`ui-button ui-button--secondary ui-button--sm vendor-product-media__file-label${
                    disabled ? " vendor-product-media__add--disabled" : ""
                  }`}
                >
                  Replace
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    aria-label={`Replace image ${index + 1}`}
                    className="vendor-product-media__file-input"
                    disabled={disabled}
                    onChange={(event) => replace(item.id, event.target.files?.[0])}
                    type="file"
                  />
                </label>
                {replacement?.status === "failed" ? (
                  <Button
                    aria-label={`Retry replacement for image ${index + 1}`}
                    disabled={disabled}
                    onClick={() => onRetry(replacement.id)}
                    variant="secondary"
                  >
                    Retry
                  </Button>
                ) : null}
                <Button
                  aria-label={`Remove image ${index + 1}`}
                  disabled={disabled}
                  onClick={() => {
                    if (replacement) removePending(replacement.id);
                    onMediaChange(media.filter((candidate) => candidate.id !== item.id));
                  }}
                  variant="danger"
                >
                  Remove
                </Button>
              </div>
            </article>
          );
        })}

        {additions.map((item, index) => {
          const position = media.length + index + 1;
          return (
            <article className="vendor-product-media__item" key={item.id}>
              {item.previewUrl ? (
                <Image
                  alt={`New product image ${position}`}
                  decoding="async"
                  height={240}
                  loading="lazy"
                  sizes="(max-width: 48rem) 100vw, (max-width: 80rem) 50vw, 20rem"
                  src={item.previewUrl}
                  unoptimized
                  width={320}
                />
              ) : null}
              <div>
                <strong>Image {position}</strong>
                <small>{item.file.name}</small>
              </div>
              {item.status === "uploading" ? (
                <progress aria-label={`Uploading image ${position}`} />
              ) : null}
              {item.status === "failed" ? (
                <p className="vendor-product-form__error" role="alert">
                  {item.error}
                </p>
              ) : null}
              <div className="vendor-product-media__actions">
                <Button
                  aria-label={`Move new image ${position} earlier`}
                  disabled={disabled || index === 0}
                  onClick={() => {
                    const moved = move(additions, index, -1);
                    onPendingChange([
                      ...pending.filter((candidate) => candidate.mediaId),
                      ...moved,
                    ]);
                  }}
                  variant="ghost"
                >
                  Earlier
                </Button>
                <Button
                  aria-label={`Move new image ${position} later`}
                  disabled={disabled || index === additions.length - 1}
                  onClick={() => {
                    const moved = move(additions, index, 1);
                    onPendingChange([
                      ...pending.filter((candidate) => candidate.mediaId),
                      ...moved,
                    ]);
                  }}
                  variant="ghost"
                >
                  Later
                </Button>
                {item.status === "failed" ? (
                  <Button
                    aria-label={`Retry upload for ${item.file.name}`}
                    disabled={disabled}
                    onClick={() => onRetry(item.id)}
                    variant="secondary"
                  >
                    Retry
                  </Button>
                ) : null}
                <Button
                  aria-label={`Remove ${item.file.name}`}
                  disabled={disabled}
                  onClick={() => removePending(item.id)}
                  variant="danger"
                >
                  Remove
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {selectionError ? (
        <p className="vendor-product-form__error" role="alert">
          {selectionError}
        </p>
      ) : null}
      <label
        className={`ui-button ui-button--secondary ui-button--md vendor-product-media__file-label${
          disabled || media.length + additions.length >= MAX_PRODUCT_IMAGES
            ? " vendor-product-media__add--disabled"
            : ""
        }`}
      >
        Add images
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={`${inputId}-help`}
          className="vendor-product-media__file-input"
          disabled={disabled || media.length + additions.length >= MAX_PRODUCT_IMAGES}
          id={inputId}
          multiple
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
          type="file"
        />
      </label>
    </section>
  );
}
