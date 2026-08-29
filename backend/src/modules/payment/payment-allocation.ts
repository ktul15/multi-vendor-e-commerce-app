export type VendorPaymentInput = Readonly<{
  vendorOrderId: string;
  subtotalMinor: number;
  commissionRate: number;
}>;

export type VendorPaymentAllocation = Readonly<{
  vendorOrderId: string;
  commissionRate: number;
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
}>;

/**
 * Allocates the captured order total across vendors with the largest-remainder
 * method. All arithmetic is integer paise, so discounts and commissions cannot
 * create floating-point drift or transfers greater than the customer payment.
 */
export const allocateVendorPayments = (
  totalMinor: number,
  vendors: VendorPaymentInput[]
): VendorPaymentAllocation[] => {
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    throw new Error('Order total must be a non-negative integer amount');
  }
  if (vendors.length === 0) throw new Error('At least one vendor is required');
  const subtotalMinor = vendors.reduce((sum, item) => {
    if (!Number.isInteger(item.subtotalMinor) || item.subtotalMinor <= 0) {
      throw new Error('Vendor subtotals must be positive integer amounts');
    }
    return sum + item.subtotalMinor;
  }, 0);

  const shares = vendors.map((vendor, index) => {
    const numerator = totalMinor * vendor.subtotalMinor;
    return {
      vendor,
      index,
      grossMinor: Math.floor(numerator / subtotalMinor),
      remainder: numerator % subtotalMinor,
    };
  });

  let unallocated =
    totalMinor - shares.reduce((sum, share) => sum + share.grossMinor, 0);
  for (const share of [...shares].sort(
    (left, right) =>
      right.remainder - left.remainder ||
      left.vendor.vendorOrderId.localeCompare(right.vendor.vendorOrderId)
  )) {
    if (unallocated === 0) break;
    share.grossMinor += 1;
    unallocated -= 1;
  }

  return shares
    .sort((left, right) => left.index - right.index)
    .map(({ vendor, grossMinor }) => {
      const commissionBasisPoints = Math.round(vendor.commissionRate * 100);
      if (
        !Number.isInteger(commissionBasisPoints) ||
        commissionBasisPoints < 0 ||
        commissionBasisPoints > 10_000
      ) {
        throw new Error('Commission rate must be between 0 and 100 percent');
      }
      const commissionMinor = Math.round(
        (grossMinor * commissionBasisPoints) / 10_000
      );
      return {
        vendorOrderId: vendor.vendorOrderId,
        commissionRate: vendor.commissionRate,
        grossMinor,
        commissionMinor,
        netMinor: grossMinor - commissionMinor,
      };
    });
};
