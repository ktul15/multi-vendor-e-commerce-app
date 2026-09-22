import Link from "next/link";
import type { ComponentProps } from "react";

type VendorNoPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

export function VendorNoPrefetchLink(props: Readonly<VendorNoPrefetchLinkProps>) {
  return <Link {...props} prefetch={false} />;
}
