import { Badge, Card, CardContent, CardHeader, CardTitle, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CommissionSetting } from "../src/lib/commission-data";
import type { AdminVendorDetail } from "../src/lib/vendor-data";
import { actionsForVendor } from "../src/lib/vendor-lifecycle";
import { formatDashboardDate } from "../src/lib/format";
import { VendorLifecycleAction } from "./vendor-lifecycle-action";
import { vendorStatusTone } from "./admin-vendors-view";
import { CommissionRateAction } from "./commission-rate-action";

function Field({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="admin-vendor-detail__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AdminVendorDetailView({
  commissionError,
  defaultCommission,
  error,
  vendor,
}: Readonly<{
  commissionError?: string;
  defaultCommission?: CommissionSetting;
  error?: string;
  vendor?: AdminVendorDetail;
}>) {
  if (error || !vendor) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/vendors">
            Back to vendors
          </Link>
        }
        description={error ?? "Vendor details could not be loaded."}
        title="Vendor unavailable"
      />
    );
  }
  return (
    <div className="admin-vendor-detail">
      <header className="admin-vendor-detail__header">
        <div>
          <Link href="/vendors">← Vendors</Link>
          <p>Vendor profile</p>
          <h1>{vendor.storeName}</h1>
          <Badge tone={vendorStatusTone(vendor.status)}>{vendor.status}</Badge>
        </div>
        <div className="admin-vendor-detail__actions">
          {actionsForVendor(vendor.status).map((action) => (
            <VendorLifecycleAction action={action} key={action} vendor={vendor} />
          ))}
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Store and lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="admin-vendor-detail__grid">
            <Field label="Vendor profile ID" value={<code>{vendor.id}</code>} />
            <Field label="Owner user ID" value={<code>{vendor.userId}</code>} />
            <Field label="Profile status" value={vendor.status} />
            <Field
              label="Stripe onboarding"
              value={vendor.stripeOnboardingStatus.replaceAll("_", " ")}
            />
            <Field
              label="Created"
              value={
                <time dateTime={vendor.createdAt}>{formatDashboardDate(vendor.createdAt)}</time>
              }
            />
            <Field
              label="Updated"
              value={
                <time dateTime={vendor.updatedAt}>{formatDashboardDate(vendor.updatedAt)}</time>
              }
            />
            <Field
              label="Store logo"
              value={
                vendor.storeLogo ? (
                  <a href={vendor.storeLogo} rel="noreferrer" target="_blank">
                    View logo
                  </a>
                ) : (
                  "Not provided"
                )
              }
            />
            <Field
              label="Store banner"
              value={
                vendor.storeBanner ? (
                  <a href={vendor.storeBanner} rel="noreferrer" target="_blank">
                    View banner
                  </a>
                ) : (
                  "Not provided"
                )
              }
            />
          </dl>
          <div className="admin-vendor-detail__description">
            <h4>Store description</h4>
            <p>{vendor.description || "No description provided."}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Commission</CardTitle>
            <p className="admin-commission__description">
              A vendor override takes precedence over the platform default.
            </p>
          </div>
          <Badge tone={vendor.commissionRate === null ? "neutral" : "info"}>
            {vendor.commissionRate === null ? "Platform default" : "Vendor override"}
          </Badge>
        </CardHeader>
        <CardContent>
          {commissionError || !defaultCommission ? (
            <p className="admin-commission-error" role="alert">
              {commissionError ?? "Platform default could not be loaded."}
            </p>
          ) : (
            <div className="admin-commission__rate">
              <div>
                <span>Effective rate</span>
                <strong>
                  {Number(vendor.commissionRate ?? defaultCommission.rate).toFixed(2)}%
                </strong>
                <small>
                  Platform default: {defaultCommission.rate.toFixed(2)}%
                  {vendor.commissionRate === null ? " (currently inherited)" : ""}
                </small>
              </div>
              <CommissionRateAction
                currentRate={vendor.commissionRate === null ? null : Number(vendor.commissionRate)}
                defaultRate={defaultCommission.rate}
                target={{ id: vendor.id, kind: "vendor", storeName: vendor.storeName }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Owner account</CardTitle>
          <div className="admin-vendor-detail__badges">
            <Badge tone={vendor.user.isVerified ? "success" : "warning"}>
              {vendor.user.isVerified ? "Verified" : "Unverified"}
            </Badge>
            <Badge tone={vendor.user.isBanned ? "danger" : "success"}>
              {vendor.user.isBanned ? "Banned" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="admin-vendor-detail__grid">
            <Field label="Name" value={vendor.user.name} />
            <Field label="Email" value={vendor.user.email} />
            <Field label="Owner ID" value={<code>{vendor.user.id}</code>} />
            <Field
              label="Member since"
              value={
                <time dateTime={vendor.user.createdAt}>
                  {formatDashboardDate(vendor.user.createdAt)}
                </time>
              }
            />
            <Field
              label="Avatar"
              value={
                vendor.user.avatar ? (
                  <a href={vendor.user.avatar} rel="noreferrer" target="_blank">
                    View avatar
                  </a>
                ) : (
                  "Not provided"
                )
              }
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
