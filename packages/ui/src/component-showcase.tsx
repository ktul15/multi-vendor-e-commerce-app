"use client";

import { useState } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { Dialog } from "./dialog";
import { Input, Select } from "./field";
import { Skeleton, SkeletonRegion } from "./skeleton";
import { EmptyState, ErrorState } from "./states";

export function ComponentShowcase({ productName }: Readonly<{ productName: string }>) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="ui-showcase">
      <header className="ui-showcase__header">
        <Badge tone="info">Shared UI</Badge>
        <h1>{productName} design system</h1>
        <p>
          Responsive, keyboard-accessible primitives and representative states shared by both
          dashboard applications.
        </p>
      </header>

      <section className="ui-showcase__section" aria-labelledby="actions-heading">
        <h2 id="actions-heading">Actions and statuses</h2>
        <div className="ui-showcase__row">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button loading loadingLabel="Saving">
            Save
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="ui-showcase__row">
          <Badge>Draft</Badge>
          <Badge tone="success">Approved</Badge>
          <Badge tone="warning">Processing</Badge>
          <Badge tone="danger">Suspended</Badge>
          <Badge tone="info">New</Badge>
        </div>
      </section>

      <section className="ui-showcase__section" aria-labelledby="forms-heading">
        <h2 id="forms-heading">Form controls</h2>
        <div className="ui-showcase__grid">
          <Input label="Product name" placeholder="Organic cotton shirt" />
          <Input error="SKU is already in use" label="SKU" defaultValue="SHIRT-001" />
          <Select hint="This controls storefront visibility" label="Status" defaultValue="active">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
          <Input disabled label="Store ID" defaultValue="store_123" />
        </div>
      </section>

      <section className="ui-showcase__section" aria-labelledby="content-heading">
        <h2 id="content-heading">Cards and loading states</h2>
        <div className="ui-showcase__grid ui-showcase__grid--three">
          <Card>
            <CardHeader>
              <CardTitle>Net revenue</CardTitle>
              <Badge tone="success">+12.4%</Badge>
            </CardHeader>
            <CardContent>
              <strong>₹82,450</strong>
              <p>Compared with the previous 30 days.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="ghost">
                View report
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardContent>
              <SkeletonRegion label="Loading sales summary">
                <div className="ui-showcase__section">
                  <Skeleton width="42%" />
                  <Skeleton height="2rem" width="70%" />
                  <Skeleton width="88%" />
                </div>
              </SkeletonRegion>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="ui-showcase__section" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading">Feedback and dialogs</h2>
        <div className="ui-showcase__grid">
          <EmptyState
            action={<Button size="sm">Add product</Button>}
            description="Create a product to begin selling through your storefront."
            title="No products yet"
          />
          <ErrorState
            action={
              <Button size="sm" variant="secondary">
                Try again
              </Button>
            }
            description="Check your connection and retry the request."
            title="Could not load orders"
          />
        </div>
        <div>
          <Button onClick={() => setDialogOpen(true)} variant="secondary">
            Open dialog example
          </Button>
        </div>
      </section>

      <Dialog
        description="This example demonstrates modal focus containment, Escape handling, and clear actions."
        footer={
          <>
            <Button onClick={() => setDialogOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
          </>
        }
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
        title="Confirm dashboard action"
      >
        <p>Review the details before continuing.</p>
      </Dialog>
    </main>
  );
}
