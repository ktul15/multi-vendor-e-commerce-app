import { Badge, Card, CardContent, CardHeader, CardTitle, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminUserDetail } from "../src/lib/user-data";
import { formatDashboardDate } from "../src/lib/format";
import { UserStatusAction } from "./user-status-action";

function roleTone(role: AdminUserDetail["role"]) {
  if (role === "ADMIN") return "danger" as const;
  if (role === "VENDOR") return "info" as const;
  return "neutral" as const;
}

function Field({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="admin-user-detail__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AdminUserDetailView({
  error,
  user,
}: Readonly<{ error?: string; user?: AdminUserDetail }>) {
  if (error || !user) {
    return (
      <ErrorState
        action={
          <Link className="ui-button ui-button--secondary ui-button--md" href="/users">
            Back to users
          </Link>
        }
        description={error ?? "User details could not be loaded."}
        title="User unavailable"
      />
    );
  }

  return (
    <div className="admin-user-detail">
      <header className="admin-user-detail__header">
        <div>
          <Link href="/users">← Users</Link>
          <p>Account detail</p>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
        <UserStatusAction user={user} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <div className="admin-user-detail__badges">
            <Badge tone={roleTone(user.role)}>{user.role}</Badge>
            <Badge tone={user.isBanned ? "danger" : "success"}>
              {user.isBanned ? "Banned" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="admin-user-detail__grid">
            <Field label="User ID" value={<code>{user.id}</code>} />
            <Field label="Role" value={user.role} />
            <Field
              label="Avatar"
              value={
                user.avatar ? (
                  <a href={user.avatar} rel="noreferrer" target="_blank">
                    View avatar
                  </a>
                ) : (
                  "Not provided"
                )
              }
            />
            <Field label="Email verified" value={user.isVerified ? "Yes" : "No"} />
            <Field label="Account state" value={user.isBanned ? "Banned" : "Active"} />
            <Field
              label="Member since"
              value={<time dateTime={user.createdAt}>{formatDashboardDate(user.createdAt)}</time>}
            />
            <Field
              label="Last updated"
              value={<time dateTime={user.updatedAt}>{formatDashboardDate(user.updatedAt)}</time>}
            />
          </dl>
          {user.role === "ADMIN" ? (
            <p className="admin-user-detail__notice">
              Administrator roles and access are protected from account-state changes.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {user.vendorProfile ? (
        <Card>
          <CardHeader>
            <CardTitle>Vendor profile</CardTitle>
            <Badge tone={user.vendorProfile.status === "APPROVED" ? "success" : "warning"}>
              {user.vendorProfile.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <dl className="admin-user-detail__grid">
              <Field label="Store name" value={user.vendorProfile.storeName} />
              <Field label="Vendor profile ID" value={<code>{user.vendorProfile.id}</code>} />
              <Field
                label="Store logo"
                value={
                  user.vendorProfile.storeLogo ? (
                    <a href={user.vendorProfile.storeLogo} rel="noreferrer" target="_blank">
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
                  user.vendorProfile.storeBanner ? (
                    <a href={user.vendorProfile.storeBanner} rel="noreferrer" target="_blank">
                      View banner
                    </a>
                  ) : (
                    "Not provided"
                  )
                }
              />
              <Field
                label={`${user.vendorProfile.paymentProvider === "RAZORPAY" ? "Razorpay" : "Stripe"} onboarding`}
                value={user.vendorProfile.paymentOnboardingStatus.replaceAll("_", " ")}
              />
              <Field label="Payment provider" value={user.vendorProfile.paymentProvider} />
              <Field
                label="Commission rate"
                value={
                  user.vendorProfile.commissionRate === null
                    ? "Platform default"
                    : `${user.vendorProfile.commissionRate}%`
                }
              />
              <Field
                label="Vendor since"
                value={
                  <time dateTime={user.vendorProfile.createdAt}>
                    {formatDashboardDate(user.vendorProfile.createdAt)}
                  </time>
                }
              />
              <Field
                label="Profile updated"
                value={
                  <time dateTime={user.vendorProfile.updatedAt}>
                    {formatDashboardDate(user.vendorProfile.updatedAt)}
                  </time>
                }
              />
            </dl>
            {user.vendorProfile.description ? (
              <div className="admin-user-detail__description">
                <h4>Store description</h4>
                <p>{user.vendorProfile.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
