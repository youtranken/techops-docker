/**
 * Tests cho profile.service — M1 timezone, S3 avatarUrl HTTPS, M3 transaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn().mockResolvedValue({}),
  txUserUpdate: vi.fn().mockResolvedValue({}),
  txProfileUpsert: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update: mocks.txUserUpdate },
        userProfile: { upsert: mocks.txProfileUpsert },
      }),
    ),
  },
}));

import { profileService } from '../profile.service';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('profileService.update — S3 avatarUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('avatarUrl empty/null → bypass validation (OK)', async () => {
    await expect(profileService.update('u-1', { avatarUrl: '' })).resolves.toBeDefined();
    await expect(profileService.update('u-1', { avatarUrl: null })).resolves.toBeDefined();
  });

  it('http:// → throw (phải HTTPS)', async () => {
    await expect(profileService.update('u-1', { avatarUrl: 'http://evil.com/a.png' }))
      .rejects.toThrow('HTTPS');
  });

  it('invalid URL string → throw', async () => {
    await expect(profileService.update('u-1', { avatarUrl: 'not-a-url' }))
      .rejects.toThrow('HTTPS');
  });

  it('javascript: URL → throw (protocol không phải https)', async () => {
    await expect(profileService.update('u-1', { avatarUrl: 'javascript:alert(1)' }))
      .rejects.toThrow('HTTPS');
  });

  it('valid https URL → OK', async () => {
    await expect(profileService.update('u-1', { avatarUrl: 'https://cdn.com/a.png' })).resolves.toBeDefined();
  });
});

describe('profileService.update — M1 timezone IANA', () => {
  beforeEach(() => vi.clearAllMocks());

  it('empty timezone → bypass', async () => {
    await expect(profileService.update('u-1', { timezone: '' })).resolves.toBeDefined();
  });

  it('invalid timezone → throw', async () => {
    if (typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf !== 'function') {
      return;
    }
    await expect(profileService.update('u-1', { timezone: 'Mars/Olympus' }))
      .rejects.toThrow('Timezone');
  });

  it('valid IANA (Asia/Ho_Chi_Minh) → OK trên mọi runtime', async () => {
    await expect(profileService.update('u-1', { timezone: 'Asia/Ho_Chi_Minh' })).resolves.toBeDefined();
  });

  it('valid IANA alias (Asia/Saigon) → OK', async () => {
    await expect(profileService.update('u-1', { timezone: 'Asia/Saigon' })).resolves.toBeDefined();
  });

  it('valid IANA (Asia/Bangkok) → OK', async () => {
    await expect(profileService.update('u-1', { timezone: 'Asia/Bangkok' })).resolves.toBeDefined();
  });

  it('valid IANA (UTC) → OK', async () => {
    await expect(profileService.update('u-1', { timezone: 'UTC' })).resolves.toBeDefined();
  });
});

describe('profileService.update — M3 transaction atomicity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chỉ có user fields → chỉ update user, không touch profile', async () => {
    await profileService.update('u-1', { displayName: 'Test' });
    expect(mocks.txUserUpdate).toHaveBeenCalled();
    expect(mocks.txProfileUpsert).not.toHaveBeenCalled();
  });

  it('chỉ có profile fields → chỉ upsert profile, không touch user', async () => {
    await profileService.update('u-1', { phone: '0900000000' });
    expect(mocks.txProfileUpsert).toHaveBeenCalled();
    expect(mocks.txUserUpdate).not.toHaveBeenCalled();
  });

  it('cả user + profile → cả hai chạy trong 1 transaction', async () => {
    await profileService.update('u-1', { displayName: 'Test', phone: '0900000000' });
    expect(mocks.txUserUpdate).toHaveBeenCalled();
    expect(mocks.txProfileUpsert).toHaveBeenCalled();
  });
});
