import { allocateVendorPayments } from '@modules/payment/payment-allocation';

describe('allocateVendorPayments', () => {
  it('allocates every paise exactly once with deterministic rounding', () => {
    const allocations = allocateVendorPayments(10_001, [
      { vendorOrderId: 'vendor-a', subtotalMinor: 1, commissionRate: 10 },
      { vendorOrderId: 'vendor-b', subtotalMinor: 1, commissionRate: 10 },
      { vendorOrderId: 'vendor-c', subtotalMinor: 1, commissionRate: 10 },
    ]);

    expect(allocations.map((item) => item.grossMinor)).toEqual([
      3334, 3334, 3333,
    ]);
    expect(allocations.reduce((sum, item) => sum + item.grossMinor, 0)).toBe(
      10_001
    );
    expect(
      allocations.every(
        (item) => item.netMinor + item.commissionMinor === item.grossMinor
      )
    ).toBe(true);
  });

  it('rejects invalid commission rates', () => {
    expect(() =>
      allocateVendorPayments(100, [
        { vendorOrderId: 'vendor-a', subtotalMinor: 100, commissionRate: 101 },
      ])
    ).toThrow('Commission rate must be between 0 and 100 percent');
  });
});
