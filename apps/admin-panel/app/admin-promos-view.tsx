"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Select,
} from "@repo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AdminPromo, AdminPromos } from "../src/lib/promo-data";
import { promoListHref } from "../src/lib/promo-list-state";
import type { PromoListState } from "../src/lib/promo-list-state";
import { formatDashboardDate, formatInr } from "../src/lib/format";

export type PromoLifecycle = "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "INACTIVE";

export function promoLifecycle(promo: AdminPromo, now = Date.now()): PromoLifecycle {
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= now) return "EXPIRED";
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) return "EXHAUSTED";
  if (promo.isActive) return "ACTIVE";
  return "INACTIVE";
}

function lifecycleTone(status: PromoLifecycle) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "EXPIRED" || status === "EXHAUSTED") return "danger" as const;
  return "warning" as const;
}

function csrfToken(): string | undefined {
  const value = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("="))
    .find(([name]) => name === "admin_csrf_token")
    ?.slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : undefined;
}

function PromoAction({
  action,
  promo,
}: Readonly<{ action: "deactivate" | "delete"; promo: AdminPromo }>) {
  const router = useRouter();
  const requestInFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const deleting = action === "delete";
  const label = deleting ? "Delete" : "Deactivate";
  const submit = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      const token = csrfToken();
      const response = await fetch(`/api/promos/${promo.id}`, {
        ...(deleting ? {} : { body: JSON.stringify({ isActive: false }) }),
        headers: {
          ...(deleting ? {} : { "Content-Type": "application/json" }),
          ...(token ? { "X-CSRF-Token": token } : {}),
        },
        method: deleting ? "DELETE" : "PUT",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || `Promo code could not be ${action}d`);
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Promo code could not be ${action}d`);
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  };
  return (
    <>
      <Button
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
        size="sm"
        variant={deleting ? "danger" : "secondary"}
      >
        {label}
      </Button>
      <Dialog
        description={
          deleting
            ? "This soft-archives the promo. It disappears from management lists, while order and usage history are retained."
            : "Customers will immediately stop being able to redeem this promo. It can be reactivated from the edit page."
        }
        footer={
          <>
            <Button disabled={pending} onClick={() => setOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              loading={pending}
              loadingLabel={`${label} in progress`}
              onClick={() => void submit()}
              variant={deleting ? "danger" : "primary"}
            >
              Confirm {action}
            </Button>
          </>
        }
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        open={open}
        title={`${label} ${promo.code}?`}
      >
        {error ? (
          <p className="admin-promo-error" role="alert">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}

function PromoFilters({ state }: Readonly<{ state: PromoListState }>) {
  return (
    <form action="/promos" className="admin-promo-filters" method="get">
      <input name="page" type="hidden" value="1" />
      <input name="sort" type="hidden" value="createdAt" />
      <Input
        defaultValue={state.search}
        label="Search promo codes"
        maxLength={30}
        name="search"
        placeholder="SUMMER20"
      />
      <Select
        defaultValue={state.discountType ?? ""}
        label="Discount type"
        name="filter.discountType"
      >
        <option value="">All discount types</option>
        <option value="PERCENTAGE">Percentage</option>
        <option value="FIXED">Fixed amount</option>
      </Select>
      <Select
        defaultValue={state.isActive === undefined ? "" : String(state.isActive)}
        label="Backend activation"
        name="filter.isActive"
      >
        <option value="">All activation states</option>
        <option value="true">Active flag</option>
        <option value="false">Inactive flag</option>
      </Select>
      <Select defaultValue={String(state.pageSize)} label="Rows per page" name="pageSize">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
      <div className="admin-promo-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Link className="ui-button ui-button--ghost ui-button--md" href="/promos">
          Clear
        </Link>
      </div>
    </form>
  );
}

export function AdminPromosView({
  error,
  promos,
  state,
}: Readonly<{ error?: string; promos?: AdminPromos; state: PromoListState }>) {
  const hasFilters = Boolean(state.search || state.discountType || state.isActive !== undefined);
  return (
    <div className="admin-promo-list">
      <header className="admin-promo-list__header">
        <div>
          <p>Campaign controls</p>
          <h1>Promo codes</h1>
          <p>Manage discount rules, availability, usage, and expiry.</p>
        </div>
        <Link className="ui-button ui-button--primary ui-button--md" href="/promos/new">
          Create promo code
        </Link>
      </header>
      <Card>
        <CardContent>
          <PromoFilters state={state} />
        </CardContent>
      </Card>
      {error ? (
        <ErrorState
          action={
            <Link
              className="ui-button ui-button--secondary ui-button--md"
              href={promoListHref(state)}
            >
              Try again
            </Link>
          }
          description={error}
          title="Promo codes unavailable"
        />
      ) : promos ? (
        <Card>
          <CardContent>
            {promos.items.length ? (
              <div
                aria-label="Promo codes table"
                className="admin-promo-table-wrap"
                role="region"
                tabIndex={0}
              >
                <table className="admin-promo-table">
                  <caption className="ui-visually-hidden">Marketplace promo codes</caption>
                  <thead>
                    <tr>
                      <th scope="col">Code</th>
                      <th scope="col">Discount</th>
                      <th scope="col">State</th>
                      <th scope="col">Usage</th>
                      <th scope="col">Minimum order</th>
                      <th scope="col">Expiry</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.items.map((promo) => {
                      const lifecycle = promoLifecycle(promo);
                      return (
                        <tr key={promo.id}>
                          <th scope="row">
                            <code>{promo.code}</code>
                          </th>
                          <td>
                            {promo.discountType === "PERCENTAGE"
                              ? `${Number(promo.discountValue)}%${promo.maxDiscount ? ` (max ${formatInr(promo.maxDiscount)})` : ""}`
                              : formatInr(promo.discountValue)}
                          </td>
                          <td>
                            <Badge tone={lifecycleTone(lifecycle)}>{lifecycle}</Badge>
                            {lifecycle === "INACTIVE" ? (
                              <small>Manual activation required</small>
                            ) : null}
                          </td>
                          <td>
                            {promo.usageCount} / {promo.usageLimit ?? "Unlimited"}
                            <small>
                              {promo.perUserLimit
                                ? `${promo.perUserLimit} per customer`
                                : "No per-customer limit"}
                            </small>
                          </td>
                          <td>{promo.minOrderValue ? formatInr(promo.minOrderValue) : "None"}</td>
                          <td>
                            {promo.expiresAt ? (
                              <time dateTime={promo.expiresAt}>
                                {formatDashboardDate(promo.expiresAt)}
                              </time>
                            ) : (
                              "No expiry"
                            )}
                          </td>
                          <td>
                            <div className="admin-promo-table__actions">
                              <Link
                                className="ui-button ui-button--ghost ui-button--sm"
                                href={`/promos/${promo.id}/edit`}
                              >
                                Edit
                              </Link>
                              {promo.isActive ? (
                                <PromoAction action="deactivate" promo={promo} />
                              ) : null}
                              <PromoAction action="delete" promo={promo} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                action={
                  hasFilters ? (
                    <Link className="ui-button ui-button--secondary ui-button--md" href="/promos">
                      Clear filters
                    </Link>
                  ) : (
                    <Link className="ui-button ui-button--primary ui-button--md" href="/promos/new">
                      Create promo code
                    </Link>
                  )
                }
                description={
                  hasFilters
                    ? "Try different promo filters."
                    : "Create a campaign-ready promo code."
                }
                title={hasFilters ? "No matching promo codes" : "No promo codes yet"}
              />
            )}
            {promos.items.length ? (
              <nav aria-label="Promo pagination" className="admin-promo-pagination">
                {state.page <= 1 ? (
                  <span aria-disabled="true">Previous</span>
                ) : (
                  <Link href={promoListHref(state, { page: state.page - 1 })}>Previous</Link>
                )}
                <span>
                  Page {promos.meta.page} of {promos.meta.totalPages}
                </span>
                {state.page >= promos.meta.totalPages ? (
                  <span aria-disabled="true">Next</span>
                ) : (
                  <Link href={promoListHref(state, { page: state.page + 1 })}>Next</Link>
                )}
              </nav>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
