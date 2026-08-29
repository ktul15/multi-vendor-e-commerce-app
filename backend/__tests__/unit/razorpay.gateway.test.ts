// eslint-disable-next-line no-var
var mockFetchMultipleRefund: jest.Mock;
// eslint-disable-next-line no-var
var mockRefund: jest.Mock;

jest.mock('../../src/config/env', () => ({
  env: {
    RAZORPAY_KEY_ID: 'rzp_test_gateway',
    RAZORPAY_KEY_SECRET: 'test-secret',
    RAZORPAY_SANDBOX_MOCK: false,
    RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret',
  },
}));

jest.mock('../../src/config/razorpay', () => {
  mockFetchMultipleRefund = jest.fn();
  mockRefund = jest.fn();
  return {
    razorpay: {
      api: { get: jest.fn(), post: jest.fn() },
      orders: {
        all: jest.fn(),
        create: jest.fn(),
        fetchTransferOrder: jest.fn(),
      },
      payments: {
        fetchMultipleRefund: mockFetchMultipleRefund,
        refund: mockRefund,
        transfer: jest.fn(),
      },
      transfers: { reverse: jest.fn() },
    },
  };
});

import { RazorpayGateway } from '../../src/modules/payment/providers/razorpay.gateway';

describe('RazorpayGateway refund reconciliation', () => {
  const request = {
    paymentId: 'pay_test',
    amountMinor: 4000,
    isFullRefund: false,
    receipt: 'refund-record-id',
    idempotencyKey: 'refund-record-id',
  };

  beforeEach(() => {
    mockFetchMultipleRefund.mockReset();
    mockRefund.mockReset();
  });

  it('returns a prior provider refund with the same receipt before retrying', async () => {
    mockFetchMultipleRefund.mockResolvedValue({
      items: [
        {
          id: 'rfnd_existing',
          amount: 4000,
          receipt: request.receipt,
          notes: {},
          status: 'processed',
        },
      ],
    });

    await expect(new RazorpayGateway().refund(request)).resolves.toEqual({
      refundId: 'rfnd_existing',
      status: 'SUCCEEDED',
    });
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it('sends the stable receipt and note for a new refund', async () => {
    mockFetchMultipleRefund.mockResolvedValue({ items: [] });
    mockRefund.mockResolvedValue({ id: 'rfnd_new', status: 'pending' });

    await new RazorpayGateway().refund(request);

    expect(mockRefund).toHaveBeenCalledWith(
      request.paymentId,
      expect.objectContaining({
        amount: request.amountMinor,
        receipt: request.receipt,
        notes: { refundRecordId: request.idempotencyKey },
      })
    );
  });
});
