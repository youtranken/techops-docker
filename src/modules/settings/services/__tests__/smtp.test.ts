/**
 * Tests cho smtp.service — M6 host/port validation, SSRF guard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    smtpConfig: {
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

vi.mock('@/lib/crypto', () => ({
  encryptSecret: (v: string) => `enc:${v}`,
  decryptSecret: (v: string) => v.replace(/^enc:/, ''),
}));

import { smtpService } from '../smtp.service';

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'user@gmail.com',
    password: 'secret',
    fromName: 'TechOps',
    fromEmail: 'noreply@techops.local',
    isActive: true,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('smtpService.upsert — host/port validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(null);
  });

  it('host rỗng → throw', async () => {
    await expect(smtpService.upsert(validInput({ host: '' }))).rejects.toThrow('Host');
    await expect(smtpService.upsert(validInput({ host: '   ' }))).rejects.toThrow('Host');
  });

  it('port < 1 → throw', async () => {
    await expect(smtpService.upsert(validInput({ port: 0 }))).rejects.toThrow('Port');
    await expect(smtpService.upsert(validInput({ port: -1 }))).rejects.toThrow('Port');
  });

  it('port > 65535 → throw', async () => {
    await expect(smtpService.upsert(validInput({ port: 65536 }))).rejects.toThrow('Port');
    await expect(smtpService.upsert(validInput({ port: 99999 }))).rejects.toThrow('Port');
  });

  it('port 1 và 65535 → OK (boundary)', async () => {
    await expect(smtpService.upsert(validInput({ port: 1 }))).resolves.toBeDefined();
    await expect(smtpService.upsert(validInput({ port: 65535 }))).resolves.toBeDefined();
  });
});

describe('smtpService.upsert — M6 SSRF guard (private/loopback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(null);
  });

  const blocked: [string, string][] = [
    ['localhost', 'localhost'],
    ['127.0.0.1', '127.0.0.1'],
    ['127.1.1.1', '127.1.1.1'],
    ['10.x (class A private)', '10.0.0.1'],
    ['172.16.x', '172.16.5.5'],
    ['172.31.x', '172.31.99.99'],
    ['192.168.x', '192.168.1.1'],
    ['169.254.x (link-local)', '169.254.169.254'],
    ['0.0.0.0', '0.0.0.0'],
    ['::1 (IPv6 loopback)', '::1'],
  ];

  it.each(blocked)('block %s → throw', async (_label, host) => {
    await expect(smtpService.upsert(validInput({ host }))).rejects.toThrow('Host');
  });

  it('public host (smtp.gmail.com) → OK', async () => {
    await expect(smtpService.upsert(validInput({ host: 'smtp.gmail.com' }))).resolves.toBeDefined();
  });

  it('172.32.x (ngoài dải private) → OK', async () => {
    await expect(smtpService.upsert(validInput({ host: '172.32.0.1' }))).resolves.toBeDefined();
  });
});

describe('smtpService.upsert — password handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(null);
  });

  it('create + không có password → throw PASSWORD_REQUIRED', async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(smtpService.upsert(validInput({ password: undefined }) as never))
      .rejects.toThrow('PASSWORD_REQUIRED');
  });

  it('existing + không có password → update không đụng password', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'cfg-1', password: 'enc:old' });
    await smtpService.upsert(validInput({ password: '' }));
    const updateCall = mocks.update.mock.calls[0]?.[0];
    expect(updateCall.data.password).toBeUndefined();
  });

  it('create + có password → encrypt trước khi lưu', async () => {
    mocks.findFirst.mockResolvedValue(null);
    await smtpService.upsert(validInput({ password: 'secret' }));
    const createCall = mocks.create.mock.calls[0]?.[0];
    expect(createCall.data.password).toBe('enc:secret');
  });
});
