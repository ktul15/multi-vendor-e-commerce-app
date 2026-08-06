/**
 * Coerce numeric strings while preserving actual numbers. Invalid input is
 * returned unchanged so the target Zod number schema reports a validation error.
 * Use with z.preprocess() for query parameter validation.
 */
export const coerceNumber = (val: unknown) => {
  if (val === undefined || val === '') return undefined;
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) return val;
  return Number(trimmed);
};

/**
 * Coerce 'true'/'false' strings while preserving actual booleans. Invalid input
 * is returned unchanged so the target Zod boolean schema rejects it.
 * Use with z.preprocess() for query parameter validation.
 */
export const coerceBoolean = (val: unknown) => {
  if (val === undefined || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return val;
};
