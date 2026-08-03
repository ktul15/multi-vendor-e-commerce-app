const mockEval = jest.fn();
const mockMget = jest.fn();

jest.mock('../../config/env', () => ({
  env: { JWT_REFRESH_SECRET: 'unit-test-refresh-secret' },
}));

jest.mock('../../config/redis', () => ({
  redis: {
    eval: (...args: unknown[]) => mockEval(...args),
    mget: (...args: unknown[]) => mockMget(...args),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn() },
}));

import {
  blacklistToken,
  getRefreshRotation,
  rotateRefreshToken,
} from '../../utils/tokenBlacklist';

describe('refresh token Redis state machine', () => {
  beforeEach(() => {
    mockEval.mockReset();
    mockMget.mockReset();
  });

  it('claims and publishes a proof-bound rotation through one Redis evaluation', async () => {
    mockEval.mockResolvedValue(1);

    await expect(
      rotateRefreshToken(
        'old-refresh',
        { accessToken: 'new-access', refreshToken: 'new-refresh' },
        2_000_000_000,
        2_000_500_000,
        'opaque-session'
      )
    ).resolves.toBe(true);
    expect(mockEval).toHaveBeenCalledTimes(1);
  });

  it('propagates an evaluation transport error without reporting rotation success', async () => {
    mockEval.mockRejectedValue(new Error('Redis connection lost'));

    await expect(
      rotateRefreshToken(
        'old-refresh',
        { accessToken: 'new-access', refreshToken: 'new-refresh' },
        2_000_000_000,
        2_000_500_000,
        'opaque-session'
      )
    ).rejects.toThrow('Redis connection lost');
  });

  it('rejects a corrupted encrypted grace result instead of replaying it', async () => {
    mockEval.mockResolvedValue('malformed.encrypted.payload');

    await expect(
      getRefreshRotation('old-refresh', 'opaque-session')
    ).rejects.toThrow();
  });

  it('does not query or expose a grace result without an opaque proof', async () => {
    await expect(getRefreshRotation('old-refresh')).resolves.toBeNull();
    expect(mockEval).not.toHaveBeenCalled();
  });

  it('fails logout closed when atomic revocation cannot be recorded', async () => {
    mockEval.mockRejectedValue(new Error('Redis unavailable'));

    await expect(blacklistToken('refresh', 2_000_000_000)).rejects.toThrow(
      'Redis unavailable'
    );
  });
});
