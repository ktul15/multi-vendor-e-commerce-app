"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import type { Category, EditableProduct } from "../src/lib/product-data";
import { productEditorSchema, toProductFormValues } from "../src/lib/product-form-schema";
import type { ProductEditorValues } from "../src/lib/product-form-schema";
import { CategorySelector, flattenCategoryOptions } from "./category-selector";

const EMPTY_DISABLED_CATEGORY_IDS: ReadonlySet<string> = new Set();

function csrfToken(): string | undefined {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "vendor_csrf_token")
    ?.slice(1)
    .join("=");
}

function defaults(product?: EditableProduct): ProductEditorValues {
  return product
    ? {
        basePrice: Number(product.basePrice),
        categoryId: product.categoryId,
        description: product.description,
        images:
          product.media.length > 0 ? product.media.map((image) => image.url) : [...product.images],
        isActive: product.isActive,
        name: product.name,
        tags: [...product.tags],
        variants: (product.variants ?? []).map((variant) => ({
          color: variant.color ?? "",
          id: variant.id,
          priceAdjustment:
            Math.round((Number(variant.price) - Number(product.basePrice)) * 100) / 100,
          size: variant.size ?? "",
          sku: variant.sku,
          stock: variant.stock,
        })),
      }
    : {
        basePrice: 0,
        categoryId: "",
        description: "",
        images: [],
        isActive: true,
        name: "",
        tags: [],
        variants: [{ color: "", priceAdjustment: 0, size: "", sku: "", stock: 0 }],
      };
}

export function ProductForm({
  categories,
  disabledCategoryIds = EMPTY_DISABLED_CATEGORY_IDS,
  product,
}: Readonly<{
  categories: readonly Category[];
  disabledCategoryIds?: ReadonlySet<string>;
  product?: EditableProduct;
}>) {
  const router = useRouter();
  const editing = Boolean(product);
  const [submissionError, setSubmissionError] = useState<string>();
  const [navigationAllowed, setNavigationAllowed] = useState(false);
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<ProductEditorValues>({
    defaultValues: defaults(product),
    resolver: zodResolver(productEditorSchema),
  });
  const variants = useFieldArray({ control, name: "variants" });
  const images = useWatch({ control, name: "images" });
  const variantValues = useWatch({ control, name: "variants" });
  const totalAvailability = variantValues.reduce(
    (total, variant) =>
      total + (Number.isInteger(variant.stock) && variant.stock >= 0 ? variant.stock : 0),
    0,
  );
  const validCategoryIds = new Set(
    flattenCategoryOptions(categories)
      .filter((category) => !disabledCategoryIds.has(category.id))
      .map((category) => category.id),
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty || navigationAllowed) return;
      event.preventDefault();
    };
    const confirmLink = (event: MouseEvent) => {
      if (
        !isDirty ||
        navigationAllowed ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (!window.confirm("Discard your unsaved product changes?")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      setNavigationAllowed(true);
    };
    const currentUrl = window.location.href;
    const confirmHistory = (event: PopStateEvent) => {
      if (!isDirty || navigationAllowed) return;
      if (window.confirm("Discard your unsaved product changes?")) {
        setNavigationAllowed(true);
        return;
      }
      event.stopImmediatePropagation();
      window.history.pushState(null, "", currentUrl);
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("popstate", confirmHistory, true);
    document.addEventListener("click", confirmLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("popstate", confirmHistory, true);
      document.removeEventListener("click", confirmLink, true);
    };
  }, [isDirty, navigationAllowed]);

  const submit = handleSubmit(async (values) => {
    setSubmissionError(undefined);
    if (!validCategoryIds.has(values.categoryId)) {
      setError("categoryId", { message: "Choose an available category", type: "validate" });
      return;
    }
    const token = csrfToken();
    try {
      const response = await fetch(product ? `/api/products/${product.id}` : "/api/products", {
        body: JSON.stringify(toProductFormValues(values)),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": decodeURIComponent(token) } : {}),
        },
        method: product ? "PUT" : "POST",
      });
      const payload = (await response.json().catch(() => undefined)) as
        | Readonly<{
            errors?: Array<Readonly<{ field?: string; message?: string; path?: PropertyKey[] }>>;
            message?: string;
          }>
        | undefined;
      if (!response.ok) {
        for (const error of payload?.errors ?? []) {
          const serverField = error.field ?? error.path?.join(".");
          const field = serverField?.replace(/(variants\.\d+)\.price$/, "$1.priceAdjustment");
          if (
            field &&
            /^(name|description|basePrice|categoryId|images(\.\d+)?|isActive|tags|variants(\.\d+\.(sku|priceAdjustment|stock|size|color))?)$/.test(
              field,
            )
          ) {
            setError(field as FieldPath<ProductEditorValues>, {
              message: error.message ?? "Invalid value",
              type: "server",
            });
          }
        }
        throw new Error(payload?.message ?? "Product could not be saved");
      }
      setNavigationAllowed(true);
      router.push("/products");
      router.refresh();
    } catch (cause) {
      setSubmissionError(cause instanceof Error ? cause.message : "Product could not be saved");
    }
  });

  return (
    <form className="vendor-product-form" noValidate onSubmit={(event) => void submit(event)}>
      <header className="vendor-product-form__header">
        <div>
          <p>Catalog management</p>
          <h1>{editing ? "Edit product" : "Add product"}</h1>
          <p>
            {editing
              ? "Update listing details, variants, and inventory."
              : "Create a customer-ready product listing."}
          </p>
        </div>
        <div className="vendor-product-form__actions">
          <Link className="ui-button ui-button--secondary ui-button--md" href="/products">
            Cancel
          </Link>
          <Button loading={isSubmitting} loadingLabel="Saving product" type="submit">
            {editing ? "Save changes" : "Create product"}
          </Button>
        </div>
      </header>

      {submissionError ? (
        <p className="vendor-product-form__error" role="alert">
          {submissionError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Product details</CardTitle>
        </CardHeader>
        <CardContent className="vendor-product-form__grid">
          <Input error={errors.name?.message} label="Name" required {...register("name")} />
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <CategorySelector
                categories={categories}
                disabledIds={disabledCategoryIds}
                error={errors.categoryId?.message}
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Input
            error={errors.basePrice?.message}
            label="Base price"
            min="0"
            required
            step="0.01"
            type="number"
            {...register("basePrice", { valueAsNumber: true })}
          />
          <label className="vendor-product-form__checkbox">
            <input type="checkbox" {...register("isActive")} />
            <span>
              <strong>Active listing</strong>
              <small>Visible to customers when enabled.</small>
            </span>
          </label>
          <label className="ui-field vendor-product-form__wide">
            <span className="ui-field__label">Description *</span>
            <textarea
              aria-invalid={Boolean(errors.description)}
              className="ui-field__control vendor-product-form__textarea"
              {...register("description")}
            />
            {errors.description ? (
              <span className="ui-field__message ui-field__message--error">
                {errors.description.message}
              </span>
            ) : null}
          </label>
          <Input
            defaultValue={product?.tags.join(", ")}
            hint="Comma-separated keywords"
            label="Tags"
            onChange={(event) =>
              setValue(
                "tags",
                event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
                { shouldDirty: true },
              )
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="vendor-product-form__hint">
            Add up to five HTTPS image URLs. Upload management follows in the media workflow.
          </p>
          <div className="vendor-product-form__rows">
            {images.map((_, index) => (
              <div className="vendor-product-form__row" key={`image-${index}`}>
                <Input
                  error={errors.images?.[index]?.message}
                  label={`Image ${index + 1} URL`}
                  type="url"
                  {...register(`images.${index}`)}
                />
                <Button
                  onClick={() =>
                    setValue(
                      "images",
                      images.filter((__, item) => item !== index),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {typeof errors.images?.message === "string" ? (
            <p className="vendor-product-form__error">{errors.images.message}</p>
          ) : null}
          <Button
            disabled={images.length >= 5}
            onClick={() => setValue("images", [...images, ""], { shouldDirty: true })}
            variant="secondary"
          >
            Add image URL
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variants and inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="vendor-product-form__inventory-summary">
            <span>Total availability</span>
            <output aria-live="polite">
              <strong>{totalAvailability}</strong> {totalAvailability === 1 ? "unit" : "units"}
            </output>
            <small>Calculated from variant stock so the product total always stays in sync.</small>
          </div>
          {(errors.variants?.root?.message ?? errors.variants?.message) ? (
            <p className="vendor-product-form__error">
              {errors.variants?.root?.message ?? errors.variants?.message}
            </p>
          ) : null}
          <div className="vendor-product-form__variants">
            {variants.fields.map((field, index) => (
              <fieldset className="vendor-product-form__variant" key={field.id}>
                <legend>Variant {index + 1}</legend>
                <Input
                  error={errors.variants?.[index]?.sku?.message}
                  label="SKU"
                  required
                  {...register(`variants.${index}.sku`)}
                />
                <Input
                  error={errors.variants?.[index]?.priceAdjustment?.message}
                  hint="Added to the base price; negative values discount this variant."
                  label="Price adjustment"
                  required
                  step="0.01"
                  type="number"
                  {...register(`variants.${index}.priceAdjustment`, { valueAsNumber: true })}
                />
                <Input
                  error={errors.variants?.[index]?.stock?.message}
                  label="Stock"
                  min="0"
                  required
                  step="1"
                  type="number"
                  {...register(`variants.${index}.stock`, { valueAsNumber: true })}
                />
                <Input
                  error={errors.variants?.[index]?.size?.message}
                  label="Size"
                  {...register(`variants.${index}.size`)}
                />
                <Input
                  error={errors.variants?.[index]?.color?.message}
                  label="Color"
                  {...register(`variants.${index}.color`)}
                />
                <Button
                  disabled={variants.fields.length === 1}
                  onClick={() => variants.remove(index)}
                  variant="danger"
                >
                  Remove variant
                </Button>
              </fieldset>
            ))}
          </div>
          <Button
            onClick={() =>
              variants.append({ color: "", priceAdjustment: 0, size: "", sku: "", stock: 0 })
            }
            variant="secondary"
          >
            Add variant
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
