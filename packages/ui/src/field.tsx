import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type FieldFrameProps = Readonly<{
  children: ReactNode;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  required?: boolean;
}>;

function FieldFrame({ children, error, hint, id, label, required }: FieldFrameProps) {
  const message = error ?? hint;

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {message ? (
        <p
          className={`ui-field__message${error ? " ui-field__message--error" : ""}`}
          id={`${id}-message`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> &
  Readonly<{ error?: string; hint?: string; label: string }>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    "aria-describedby": externalDescribedBy,
    "aria-invalid": externalInvalid,
    className = "",
    error,
    hint,
    id: providedId,
    label,
    required,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const generatedDescription = error || hint ? `${id}-message` : undefined;
  const describedBy =
    [externalDescribedBy, generatedDescription].filter(Boolean).join(" ") || undefined;

  return (
    <FieldFrame error={error} hint={hint} id={id} label={label} required={required}>
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : externalInvalid}
        className={`ui-field__control ${className}`.trim()}
        id={id}
        ref={ref}
        required={required}
      />
    </FieldFrame>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  Readonly<{ error?: string; hint?: string; label: string }>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    "aria-describedby": externalDescribedBy,
    "aria-invalid": externalInvalid,
    children,
    className = "",
    error,
    hint,
    id: providedId,
    label,
    required,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const generatedDescription = error || hint ? `${id}-message` : undefined;
  const describedBy =
    [externalDescribedBy, generatedDescription].filter(Boolean).join(" ") || undefined;

  return (
    <FieldFrame error={error} hint={hint} id={id} label={label} required={required}>
      <select
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : externalInvalid}
        className={`ui-field__control ${className}`.trim()}
        id={id}
        ref={ref}
        required={required}
      >
        {children}
      </select>
    </FieldFrame>
  );
});
