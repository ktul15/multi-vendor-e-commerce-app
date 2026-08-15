"use client";

import { Badge, Button, Card, CardContent, Dialog, EmptyState, ErrorState, Select } from "@repo/ui";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminBanner, AdminBanners } from "../src/lib/banner-data";
import { bannerListHref } from "../src/lib/banner-list-state";
import type { BannerListState } from "../src/lib/banner-list-state";

function token() {
  return document.cookie
    .split(";")
    .map((x) => x.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
}
async function mutate(id: string, method: "DELETE" | "PUT", active?: boolean) {
  const body = active === undefined ? undefined : new FormData();
  if (body) body.set("isActive", String(active));
  const csrf = token();
  const response = await fetch(`/api/banners/${id}`, {
    body,
    headers: csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : undefined,
    method,
  });
  const payload =
    response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(payload?.message ?? "Banner request failed");
}

export function AdminBannersView({
  banners,
  error,
  state,
}: Readonly<{ banners?: AdminBanners; error?: string; state: BannerListState }>) {
  const router = useRouter();
  const [preview, setPreview] = useState<AdminBanner>();
  const [confirmation, setConfirmation] = useState<{
    banner: AdminBanner;
    kind: "deactivate" | "delete";
  }>();
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  if (error)
    return (
      <ErrorState
        action={
          <Link
            className="ui-button ui-button--secondary ui-button--md"
            href={bannerListHref(state)}
          >
            Retry
          </Link>
        }
        description={error}
        title="Banners unavailable"
      />
    );
  const items = banners?.items ?? [];
  const confirm = async () => {
    if (!confirmation) return;
    setBusy(confirmation.banner.id);
    setActionError(undefined);
    try {
      await mutate(
        confirmation.banner.id,
        confirmation.kind === "delete" ? "DELETE" : "PUT",
        confirmation.kind === "deactivate" ? false : undefined,
      );
      setConfirmation(undefined);
      router.refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Banner request failed");
    } finally {
      setBusy(undefined);
    }
  };
  const activate = async (banner: AdminBanner) => {
    setBusy(banner.id);
    setActionError(undefined);
    try {
      await mutate(banner.id, "PUT", true);
      router.refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Banner could not be activated");
    } finally {
      setBusy(undefined);
    }
  };
  return (
    <section className="admin-banner-list">
      <header className="admin-banner-list__header">
        <div>
          <p>Storefront merchandising</p>
          <h1>Banners</h1>
          <p>
            Lower positions appear first. Activation takes effect immediately; the API does not
            schedule banners by date.
          </p>
        </div>
        <Link className="ui-button ui-button--primary ui-button--md" href="/banners/new">
          Create banner
        </Link>
      </header>
      <Card>
        <CardContent>
          <form className="admin-banner-filters" action="/banners">
            <Select
              defaultValue={state.isActive === undefined ? "" : String(state.isActive)}
              label="Status"
              name="filter.isActive"
            >
              <option value="">All banners</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            <input name="page" type="hidden" value="1" />
            <input name="pageSize" type="hidden" value={state.pageSize} />
            <input name="sort" type="hidden" value="position" />
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
          {actionError ? (
            <p className="admin-banner-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {items.length === 0 ? (
            <EmptyState
              action={
                <Link className="ui-button ui-button--primary ui-button--md" href="/banners/new">
                  Create banner
                </Link>
              }
              description="Create a banner or change the status filter."
              title="No banners found"
            />
          ) : (
            <div className="admin-banner-table-wrap">
              <table className="admin-banner-table">
                <thead>
                  <tr>
                    <th>Banner</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((banner) => (
                    <tr key={banner.id}>
                      <td>
                        <div className="admin-banner-identity">
                          <Image alt="" height={56} src={banner.imageUrl} unoptimized width={112} />
                          <span>
                            <strong>{banner.title}</strong>
                            <small title={banner.linkUrl ?? undefined}>
                              {banner.linkUrl ?? "No destination link"}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>#{banner.position}</td>
                      <td>
                        <Badge tone={banner.isActive ? "success" : "neutral"}>
                          {banner.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td>
                        <time dateTime={banner.updatedAt}>
                          {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                            new Date(banner.updatedAt),
                          )}
                        </time>
                      </td>
                      <td>
                        <div className="admin-banner-actions">
                          <Button
                            disabled={busy === banner.id}
                            onClick={() => setPreview(banner)}
                            size="sm"
                            variant="ghost"
                          >
                            Preview
                          </Button>
                          <Link
                            className="ui-button ui-button--secondary ui-button--sm"
                            href={`/banners/${banner.id}/edit`}
                          >
                            Edit
                          </Link>
                          {banner.isActive ? (
                            <Button
                              disabled={busy === banner.id}
                              onClick={() => setConfirmation({ banner, kind: "deactivate" })}
                              size="sm"
                              variant="secondary"
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              disabled={busy === banner.id}
                              onClick={() => void activate(banner)}
                              size="sm"
                              variant="secondary"
                            >
                              Activate
                            </Button>
                          )}
                          <Button
                            disabled={busy === banner.id}
                            onClick={() => setConfirmation({ banner, kind: "delete" })}
                            size="sm"
                            variant="danger"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {banners && banners.meta.totalPages > 1 ? (
            <nav aria-label="Banner pagination" className="admin-banner-pagination">
              <Link
                aria-disabled={state.page <= 1}
                href={bannerListHref(state, { page: Math.max(1, state.page - 1) })}
              >
                Previous
              </Link>
              <span>
                Page {state.page} of {banners.meta.totalPages}
              </span>
              <Link
                aria-disabled={state.page >= banners.meta.totalPages}
                href={bannerListHref(state, {
                  page: Math.min(banners.meta.totalPages, state.page + 1),
                })}
              >
                Next
              </Link>
            </nav>
          ) : null}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(undefined)}
        title={preview?.title ?? "Banner preview"}
      >
        {preview ? (
          <div className="admin-banner-preview">
            <Image
              alt={preview.title}
              height={420}
              src={preview.imageUrl}
              unoptimized
              width={1280}
            />
            <p>
              {preview.linkUrl ? (
                <>
                  Destination:{" "}
                  <a href={preview.linkUrl} rel="noreferrer" target="_blank">
                    {preview.linkUrl}
                  </a>
                </>
              ) : (
                "No destination link"
              )}
            </p>
            <p>
              Position #{preview.position} ·{" "}
              {preview.isActive ? "Active now" : "Not shown on storefront"}
            </p>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        open={Boolean(confirmation)}
        onClose={() => setConfirmation(undefined)}
        title={confirmation?.kind === "delete" ? "Delete banner?" : "Deactivate banner?"}
        description={
          confirmation
            ? confirmation.kind === "delete"
              ? `Delete “${confirmation.banner.title}”? This cannot be undone.`
              : `Hide “${confirmation.banner.title}” from the storefront immediately?`
            : undefined
        }
        footer={
          <>
            <Button
              disabled={Boolean(busy)}
              onClick={() => setConfirmation(undefined)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button disabled={Boolean(busy)} onClick={() => void confirm()} variant="danger">
              {confirmation?.kind === "delete" ? "Delete banner" : "Deactivate banner"}
            </Button>
          </>
        }
      >
        {actionError ? (
          <p className="admin-banner-error" role="alert">
            {actionError}
          </p>
        ) : null}
      </Dialog>
    </section>
  );
}
