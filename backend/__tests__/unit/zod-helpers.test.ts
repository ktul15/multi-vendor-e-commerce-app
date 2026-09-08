import { coerceBoolean, coerceNumber } from '../../src/utils/zodHelpers';

describe('strict query/form coercion helpers', () => {
  it('preserves native primitives and coerces valid strings', () => {
    expect(coerceBoolean(false)).toBe(false);
    expect(coerceBoolean(true)).toBe(true);
    expect(coerceBoolean('false')).toBe(false);
    expect(coerceBoolean('true')).toBe(true);
    expect(coerceNumber(0)).toBe(0);
    expect(coerceNumber(12.5)).toBe(12.5);
    expect(coerceNumber('12.5')).toBe(12.5);
  });

  it('leaves malformed values intact so Zod rejects them', () => {
    expect(coerceBoolean('not-a-boolean')).toBe('not-a-boolean');
    expect(coerceBoolean(1)).toBe(1);
    expect(coerceNumber('not-a-number')).toBe('not-a-number');
    expect(coerceNumber('   ')).toBe('   ');
    expect(coerceNumber('0x10')).toBe('0x10');
    expect(coerceNumber('1e3')).toBe('1e3');
    expect(coerceNumber(false)).toBe(false);
  });

  it('treats absent and empty form/query values as optional', () => {
    expect(coerceBoolean(undefined)).toBeUndefined();
    expect(coerceBoolean('')).toBeUndefined();
    expect(coerceNumber(undefined)).toBeUndefined();
    expect(coerceNumber('')).toBeUndefined();
  });
});
