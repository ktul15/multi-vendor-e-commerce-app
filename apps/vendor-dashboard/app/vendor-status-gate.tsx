"use client";

import { Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@repo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { VendorAccessProfile, VendorStatus } from "../src/lib/vendor-access";

const statusContent: Record<
  VendorStatus,
  Readonly<{
    description: string;
    eyebrow: string;
    title: string;
    tone: "danger" | "success" | "warning";
  }>
> = {
  APPROVED: {
    description: "Products, orders, earnings, and store tools are available.",
    eyebrow: "Approved",
    title: "Your store is ready for business",
    tone: "success",
  },
  PENDING: {
    description:
      "Our marketplace team is reviewing your application. You can keep your store profile current while you wait.",
    eyebrow: "Pending review",
    title: "Your application is under review",
    tone: "warning",
  },
  REJECTED: {
    description:
      "This application was not approved. Store changes and operational tools are unavailable; contact marketplace support for next steps.",
    eyebrow: "Not approved",
    title: "Your vendor application was rejected",
    tone: "danger",
  },
  SUSPENDED: {
    description:
      "Your vendor account is suspended. Store changes, products, orders, and earnings tools remain unavailable until access is restored.",
    eyebrow: "Suspended",
    title: "Your store access is paused",
    tone: "danger",
  },
};

export function VendorStatusGate({ profile }: Readonly<{ profile: VendorAccessProfile }>) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const content = statusContent[profile.status];

  const refreshStatus = () => {
    startRefresh(() => router.refresh());
  };

  return (
    <section aria-labelledby="vendor-status-title" className="vendor-status-gate">
      <Card className={`vendor-status-card vendor-status-card--${profile.status.toLowerCase()}`}>
        <CardHeader>
          <Badge tone={content.tone}>{content.eyebrow}</Badge>
          <CardTitle id="vendor-status-title">{content.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{content.description}</p>
          <p className="vendor-status-store">
            Store: <strong>{profile.storeName}</strong>
          </p>
        </CardContent>
        <CardFooter>
          {profile.status === "PENDING" ? (
            <Link className="ui-button ui-button--secondary ui-button--md" href="/store">
              Review store profile
            </Link>
          ) : null}
          <Button
            loading={refreshing}
            loadingLabel="Checking status"
            onClick={refreshStatus}
            variant={profile.status === "PENDING" ? "ghost" : "secondary"}
          >
            Refresh status
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

export function ApprovedVendorNotice({ storeName }: Readonly<{ storeName: string }>) {
  return (
    <div className="vendor-approved-notice" role="status">
      <Badge tone="success">Approved</Badge>
      <span>{storeName} has full vendor access.</span>
    </div>
  );
}
