import { prisma } from '../../src/config/prisma';
import { stripe } from '../../src/config/stripe';
import {
  connectOnboardingStatus,
  vendorPayoutService,
} from '../../src/modules/vendor-payout/vendor-payout.service';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Stripe Connect onboarding status', () => {
  it.each([
    [false, false, false, null, 'PENDING'],
    [true, false, false, null, 'PENDING'],
    [true, true, false, 'requirements.pending_verification', 'PENDING'],
    [false, false, false, 'requirements.past_due', 'RESTRICTED'],
    [true, true, true, null, 'COMPLETE'],
  ] as const)(
    'maps Stripe capabilities to an authoritative vendor state',
    (
      detailsSubmitted,
      chargesEnabled,
      payoutsEnabled,
      disabledReason,
      expected
    ) => {
      expect(
        connectOnboardingStatus({
          charges_enabled: chargesEnabled,
          details_submitted: detailsSubmitted,
          payouts_enabled: payoutsEnabled,
          requirements: { disabled_reason: disabledReason },
        })
      ).toBe(expected);
    }
  );
});

describe('Stripe Connect onboarding service', () => {
  const profile = {
    id: 'profile-1',
    userId: 'vendor-1',
    paymentProvider: 'STRIPE' as const,
    providerAccountId: null,
    paymentOnboardingStatus: 'NOT_STARTED' as const,
  };

  it('uses a stable vendor-scoped idempotency key when creating an account', async () => {
    jest
      .spyOn(prisma.vendorProfile, 'findUnique')
      .mockResolvedValue(profile as never);
    jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValue({ email: 'vendor@example.test' } as never);
    const createAccount = jest
      .spyOn(stripe.accounts, 'create')
      .mockResolvedValue({ id: 'acct_test_vendor' } as never);
    jest
      .spyOn(prisma.vendorProfile, 'update')
      .mockResolvedValue(profile as never);
    jest.spyOn(stripe.accountLinks, 'create').mockResolvedValue({
      url: 'https://connect.stripe.com/setup/s/test',
    } as never);

    await expect(
      vendorPayoutService.createConnectAccount(profile.userId)
    ).resolves.toEqual({ url: 'https://connect.stripe.com/setup/s/test' });
    expect(createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { userId: profile.userId, vendorProfileId: profile.id },
      }),
      { idempotencyKey: `vendor-connect-account:${profile.id}` }
    );
  });

  it('replays onboarding with a new link without creating another account', async () => {
    jest.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue({
      ...profile,
      providerAccountId: 'acct_test_vendor',
      paymentOnboardingStatus: 'PENDING',
    } as never);
    const createAccount = jest.spyOn(stripe.accounts, 'create');
    const createLink = jest
      .spyOn(stripe.accountLinks, 'create')
      .mockResolvedValue({
        url: 'https://connect.stripe.com/setup/s/replayed',
      } as never);

    await expect(
      vendorPayoutService.createConnectAccount(profile.userId)
    ).resolves.toEqual({ url: 'https://connect.stripe.com/setup/s/replayed' });
    expect(createAccount).not.toHaveBeenCalled();
    expect(createLink).toHaveBeenCalledWith({
      account: 'acct_test_vendor',
      refresh_url: expect.any(String),
      return_url: expect.any(String),
      type: 'account_onboarding',
    });
  });

  it('reconciles a restricted Stripe account during the return status read', async () => {
    jest.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue({
      ...profile,
      providerAccountId: 'acct_test_vendor',
      paymentOnboardingStatus: 'PENDING',
    } as never);
    jest.spyOn(stripe.accounts, 'retrieve').mockResolvedValue({
      charges_enabled: false,
      details_submitted: true,
      id: 'acct_test_vendor',
      payouts_enabled: false,
      requirements: { disabled_reason: 'requirements.past_due' },
    } as never);
    const update = jest
      .spyOn(prisma.vendorProfile, 'updateMany')
      .mockResolvedValue({ count: 1 });

    await expect(
      vendorPayoutService.getConnectStatus(profile.userId)
    ).resolves.toEqual({
      chargesEnabled: false,
      detailsSubmitted: true,
      onboardingStatus: 'RESTRICTED',
      payoutsEnabled: false,
      provider: 'STRIPE',
    });
    expect(update).toHaveBeenCalledWith({
      data: { paymentOnboardingStatus: 'RESTRICTED' },
      where: {
        id: profile.id,
        paymentOnboardingStatus: 'PENDING',
        paymentProvider: 'STRIPE',
      },
    });
  });

  it('does not call Stripe when reconciling a Razorpay sandbox vendor', async () => {
    jest.spyOn(prisma.vendorProfile, 'findUnique').mockResolvedValue({
      ...profile,
      paymentProvider: 'RAZORPAY',
      providerAccountId: 'acc_mock_vendor',
      paymentOnboardingStatus: 'COMPLETE',
    } as never);
    const retrieve = jest.spyOn(stripe.accounts, 'retrieve');

    await expect(
      vendorPayoutService.getConnectStatus(profile.userId)
    ).resolves.toMatchObject({
      onboardingStatus: 'COMPLETE',
      provider: 'RAZORPAY',
      sandbox: true,
    });
    expect(retrieve).not.toHaveBeenCalled();
  });
});
