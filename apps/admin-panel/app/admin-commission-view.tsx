import { Badge, Card, CardContent, CardHeader, CardTitle, ErrorState } from "@repo/ui";
import Link from "next/link";
import type { CommissionSetting } from "../src/lib/commission-data";
import { CommissionRateAction } from "./commission-rate-action";

export function AdminCommissionView({
  commission,
  error,
}: Readonly<{ commission?: CommissionSetting; error?: string }>) {
  return (
    <div className="admin-commission">
      <header className="admin-commission__header">
        <p>Marketplace finance</p>
        <h1>Commission management</h1>
        <p>Control the default marketplace percentage applied when a vendor has no override.</p>
      </header>
      {error || !commission ? (
        <ErrorState
          action={
            <Link className="ui-button ui-button--secondary ui-button--md" href="/finance">
              Try again
            </Link>
          }
          description={error ?? "Commission settings could not be loaded."}
          title="Commission unavailable"
        />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Platform default</CardTitle>
              <p className="admin-commission__description">
                Vendors without a custom rate inherit this value.
              </p>
            </div>
            <Badge tone={commission.source === "database" ? "info" : "warning"}>
              {commission.source === "database" ? "Admin configured" : "Environment fallback"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="admin-commission__rate">
              <div>
                <span>Current default</span>
                <strong>{commission.rate.toFixed(2)}%</strong>
              </div>
              <CommissionRateAction
                currentRate={commission.rate}
                defaultRate={commission.rate}
                target={{ kind: "platform" }}
              />
            </div>
          </CardContent>
        </Card>
      )}
      <p className="admin-commission__note">
        Revenue and payout reporting will be added to this area separately.
      </p>
    </div>
  );
}
