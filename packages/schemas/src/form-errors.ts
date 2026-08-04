import { z } from "zod";

export type FormFieldError = Readonly<{
  field?: string;
  message: string;
}>;

export type ApiFormError = Readonly<{
  fieldErrors?: readonly FormFieldError[];
  message: string;
}>;

export type FormSetError<TField extends string> = (
  field: TField,
  error: Readonly<{ message: string; type: "server" }>,
  options?: Readonly<{ shouldFocus: boolean }>,
) => void;

export const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

export function mapApiFieldErrors<TField extends string>(
  error: ApiFormError,
  knownFields: readonly TField[],
): Readonly<{ fieldErrors: ReadonlyMap<TField, string>; formError: string }> {
  const known = new Set<string>(knownFields);
  const mapped = new Map<TField, string>();
  for (const issue of error.fieldErrors ?? []) {
    if (issue.field && known.has(issue.field) && !mapped.has(issue.field as TField)) {
      mapped.set(issue.field as TField, issue.message);
    }
  }
  return { fieldErrors: mapped, formError: error.message };
}

export function applyApiFieldErrors<TField extends string>({
  error,
  fields,
  setError,
}: Readonly<{
  error: ApiFormError;
  fields: readonly TField[];
  setError: FormSetError<TField>;
}>): string {
  const mapped = mapApiFieldErrors(error, fields);
  let index = 0;
  for (const [field, message] of mapped.fieldErrors) {
    setError(field, { message, type: "server" }, { shouldFocus: index === 0 });
    index += 1;
  }
  return mapped.formError;
}
