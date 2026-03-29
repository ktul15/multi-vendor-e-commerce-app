/**
 * Coerce string query params to numbers safely, ignoring empty strings and NaN.
 * Use with z.preprocess() for query parameter validation.
 */
export const coerceNumber = (val: unknown) => {
    if (val === undefined || val === '') return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
};

/**
 * Coerce 'true'/'false' string query params to booleans.
 * Use with z.preprocess() for query parameter validation.
 */
export const coerceBoolean = (val: unknown) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
};
