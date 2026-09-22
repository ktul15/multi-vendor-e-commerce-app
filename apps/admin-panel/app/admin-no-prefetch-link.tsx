import Link from "next/link";
import type { ComponentProps } from "react";

type AdminNoPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

export function AdminNoPrefetchLink(props: Readonly<AdminNoPrefetchLinkProps>) {
  return <Link {...props} prefetch={false} />;
}
