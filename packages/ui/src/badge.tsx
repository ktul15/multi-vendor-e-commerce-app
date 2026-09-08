import type { HTMLAttributes, ReactNode } from "react";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  Readonly<{
    children: ReactNode;
    tone?: "neutral" | "success" | "warning" | "danger" | "info";
  }>;

export function Badge({ children, className = "", tone = "neutral", ...props }: BadgeProps) {
  return (
    <span {...props} className={`ui-badge ui-badge--${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}
