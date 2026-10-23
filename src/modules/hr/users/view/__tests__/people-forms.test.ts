import { describe, it, expect } from 'vitest';
import {
  validateCreate, createPayload, validateEdit, editPayload, policyChecks, validateResetPassword, DEFAULT_POLICY,
  EMPTY_CREATE, type CreateValues, type CreateMode, type EditValues, type PasswordPolicy,
} from '../people-forms';
import {
  v1SchemaManual, v1SchemaSetupLink, v1CreatePayload, v1EditSchema, v1EditPayload, v1PolicyChecks, v1CanSubmitPw,
} from './v1-people.fixture';

/** tập ô lỗi của V1 (zod) */
function v1Paths(r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return r.success ? [] : [...new Set(r.error!.issues.map((i) => String(i.path[0])))].sort();
}
const keys = (o: object) => Object.keys(o).sort();

const OK: CreateValues = { username: 'nv_an01', displayName: 'Nguyễn An', email: 'an@pmh.com.vn', password: 'Abcdef12', confirmPassword: 'Abcdef12', roleId: 'ckrole' };
const createCases: [string, Partial<CreateValues>][] = [
  ['hợp lệ', {}],
  ['rỗng hết', { ...EMPTY_CREATE }],
  ['username 2 ký tự', { username: 'ab' }],
  ['username 50', { username: 'a'.repeat(50) }],
  ['username 51', { username: 'a'.repeat(51) }],
  ['username có dấu', { username: 'nguyễn' }],
  ['username có gạch ngang', { username: 'nv-an' }],
  ['tên rỗng', { displayName: '' }],
  ['tên 100', { displayName: 'x'.repeat(100) }],
  ['tên 101', { displayName: 'x'.repeat(101) }],
  ['email rỗng', { email: '' }],
  ['email sai', { email: 'abc@' }],
  ['mật khẩu 7', { password: 'Abcdef1', confirmPassword: 'Abcdef1' }],
  ['mật khẩu không khớp', { confirmPassword: 'Abcdef13' }],
  ['mật khẩu rỗng', { password: '', confirmPassword: '' }],
  ['chưa chọn vai trò', { roleId: '' }],
  ['nhiều lỗi', { username: 'x', email: 'y', roleId: '' }],
];

describe('validateCreate — cùng ô lỗi như zod V1', () => {
  for (const mode of ['password', 'link'] as CreateMode[]) {
    it.each(createCases)(`${mode} · %s`, (_n, patch) => {
      const v = { ...OK, ...patch };
      const v1 = (mode === 'link' ? v1SchemaSetupLink : v1SchemaManual).safeParse(v);
      expect(keys(validateCreate(v, mode))).toEqual(v1Paths(v1));
    });
  }
  it('lỗi là khoá i18n', () => {
    expect(validateCreate({ ...OK, email: '' }, 'link')).toEqual({ email: 'pp.e.emailLink' });
    expect(validateCreate({ ...OK, confirmPassword: 'x' }, 'password')).toEqual({ confirmPassword: 'pp.e.pwMatch' });
    expect(validateCreate({ ...OK, roleId: '' }, 'password')).toEqual({ roleId: 'pp.e.role' });
  });
});

describe('createPayload — body POST giống V1', () => {
  for (const mode of ['password', 'link'] as CreateMode[]) {
    it.each(createCases)(`${mode} · %s`, (_n, patch) => {
      const v = { ...OK, ...patch };
      expect(createPayload(v, mode)).toEqual(v1CreatePayload(v, mode === 'link'));
      expect(JSON.stringify(createPayload(v, mode))).toBe(JSON.stringify(v1CreatePayload(v, mode === 'link')));
    });
  }
});

const EOK: EditValues = { displayName: 'Nguyễn An', email: 'an@pmh.com.vn', roleId: 'ckrole', password: '', confirmPassword: '' };
const editCases: [string, Partial<EditValues>][] = [
  ['không đổi mật khẩu', {}],
  ['email rỗng (V1 không xoá được email)', { email: '' }],
  ['email sai', { email: 'sai' }],
  ['tên rỗng', { displayName: '' }],
  ['tên 101', { displayName: 'y'.repeat(101) }],
  ['mật khẩu 5', { password: 'Ab1!x', confirmPassword: 'Ab1!x' }],
  ['mật khẩu 6 khớp', { password: 'Ab1!xy', confirmPassword: 'Ab1!xy' }],
  ['mật khẩu không khớp', { password: 'Ab1!xyz', confirmPassword: 'Ab1!xy' }],
  ['chỉ nhập ô nhập lại', { confirmPassword: 'abc' }],
  ['vai trò rỗng', { roleId: '' }],
];
describe('validateEdit / editPayload — V1', () => {
  it.each(editCases)('%s', (_n, patch) => {
    const v = { ...EOK, ...patch };
    expect(keys(validateEdit(v))).toEqual(v1Paths(v1EditSchema.safeParse(v)));
    expect(JSON.stringify(editPayload(v))).toBe(JSON.stringify(v1EditPayload(v)));
  });
});

describe('policyChecks / validateResetPassword — V1 ChangePasswordModal', () => {
  const policies: PasswordPolicy[] = [
    DEFAULT_POLICY,
    { minLength: 12, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecialChar: true },
    { minLength: 6, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecialChar: true },
  ];
  const pws: [string, string][] = [['', ''], ['abc', 'abc'], ['Abcdefg1', 'Abcdefg1'], ['Abcdefg1', 'Abcdefg2'], ['abcdefgh', 'abcdefgh'],
    ['ABCDEFG1', 'ABCDEFG1'], ['Abcdef!1', 'Abcdef!1'], ['Abcdefghij!!', 'Abcdefghij!!'], ['Ab1~', 'Ab1~'], ['', 'x']];
  for (const [pi, p] of policies.entries()) {
    it.each(pws)(`chính sách ${pi} · %s / %s`, (pw, cf) => {
      expect(policyChecks(p, pw).map((c) => c.met)).toEqual(v1PolicyChecks(p, pw).map((c) => c.met));
      const errs = validateResetPassword(pw, cf, p);
      expect(Object.keys(errs).length === 0).toBe(v1CanSubmitPw(p, pw, cf));
    });
  }
});
