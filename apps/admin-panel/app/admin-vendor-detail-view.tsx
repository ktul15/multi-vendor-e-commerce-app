import { Badge, Card, CardContent, CardHeader, CardTitle, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminVendorDetail } from "../src/lib/vendor-data";
import { actionsForVendor } from "../src/lib/vendor-lifecycle";
import { formatDashboardDate } from "../src/lib/format";
import { VendorLifecycleAction } from "./vendor-lifecycle-action";
import { vendorStatusTone } from "./admin-vendors-view";

function Field({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="admin-vendor-detail__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AdminVendorDetailView({
  error,
  vendor,
}: Readonly<{ error?: string; vendor?: AdminVendorDetail }>) {
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
              label="Commission rate"
              value={
                vendor.commissionRate === null ? "Platform default" : `${vendor.commissionRate}%`
              }
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
