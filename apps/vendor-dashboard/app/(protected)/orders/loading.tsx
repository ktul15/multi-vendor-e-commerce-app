import { Skeleton } from "@repo/ui";

export default function OrdersLoading() {
  return (
    <div aria-label="Loading vendor orders" className="vendor-orders" role="status">
      <Skeleton height="5rem" />
      <Skeleton height="7rem" />
      <Skeleton height="24rem" />
    </div>
  );
}
