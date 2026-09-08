import { z } from "zod";

export const apiUrlSchema = z.url().refine((url) => url.endsWith("/api/v1"), {
  message: "API_BASE_URL must end with /api/v1",
});

export { applyApiFieldErrors, mapApiFieldErrors, optionalTrimmedString } from "./form-errors";
export type { ApiFormError, FormFieldError, FormSetError } from "./form-errors";
export { parseTableUrlState, serializeTableUrlState } from "./table-url-state";
export type {
  TableColumnFilter,
  TableSorting,
  TableUrlOptions,
  TableUrlState,
} from "./table-url-state";
