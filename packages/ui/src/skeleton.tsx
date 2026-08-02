import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> &
  Readonly<{ height?: CSSProperties["height"]; width?: CSSProperties["width"] }>;

export function Skeleton({ className = "", height, style, width, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={`ui-skeleton ${className}`.trim()}
      style={{ ...style, height, width }}
    />
  );
}

export function SkeletonRegion({
  children,
  label = "Loading content",
}: Readonly<{ children: ReactNode; label?: string }>) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="ui-visually-hidden">{label}</span>
      {children}
    </div>
  );
}
