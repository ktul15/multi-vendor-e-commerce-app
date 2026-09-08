import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Readonly<{
    loading?: boolean;
    loadingLabel?: string;
    size?: ButtonSize;
    variant?: ButtonVariant;
    children: ReactNode;
  }>;

export function Button({
  children,
  className = "",
  disabled,
  loading = false,
  loadingLabel = "Loading",
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = `ui-button ui-button--${variant} ui-button--${size} ${className}`.trim();

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <span aria-hidden="true" className="ui-spinner" /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}
