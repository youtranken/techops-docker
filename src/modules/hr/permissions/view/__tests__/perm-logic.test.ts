import { describe, it, expect } from 'vitest';
import {
  toggleMenu, toggleFeature, menuOn, featureOn, changeCount, savePayload, differsFromDefault, DEFAULT_PERM,
  switchKeys, menusFor, PERM_ROUTE_MENU, matchUser, type MenuPerm,
} from '../perm-logic';
import { MENU_CONFIG } from '../../config';

/**
 * BẢN SAO V1 PermissionsMatrixSection.handleMenuToggle / handleFeatureToggle + PermissionsTable (040e5b2).
 * V1 gửi PUT ngay sau mỗi lần bấm, với body tính từ bản ghi hiện tại → chuỗi bấm V1 = áp lần lượt.
 */
type Row = { id: string; visibleMenus: string[]; featurePermissions: Record<string, string[]> };
function v1Menu(user: Row, menuKey: string, checked: boolean) {
  const nextMenus = checked ? [...user.visibleMenus, menuKey] : user.visibleMenus.filter((m) => m !== menuKey);
  const nextFeatures = { ...user.featurePermissions };
  if (!checked) delete nextFeatures[menuKey];
  return { userId: user.id, visibleMenus: nextMenus, featurePermissions: nextFeatures };
}
function v1Feature(user: Row, menuKey: string, featureKey: string, checked: boolean) {
  const current = user.featurePermissions[menuKey] ?? [];
  const nextFeatures = { ...user.featurePermissions, [menuKey]: checked ? [...current, featureKey] : current.filter((f) => f !== featureKey) };
  return { userId: user.id, visibleMenus: user.visibleMenus, featurePermissions: nextFeatures };
}
const v1MenuEnabled = (u: Row, m: string) => u.visibleMenus.includes(m);
const v1FeatureEnabled = (u: Row, m: string, f: string) => v1MenuEnabled(u, m) && (u.featurePermissions[m] ?? []).includes(f);

/** Bộ sinh số giả ngẫu nhiên cố định */
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31); }

describe('chuỗi bật/tắt → body PUT giống hệt V1', () => {
  const starts: MenuPerm[] = [
    DEFAULT_PERM,
    { visibleMenus: [], featurePermissions: {} },
    { visibleMenus: ['settings'], featurePermissions: { settings: ['profile'] } },
    { visibleMenus: ['logs', 'hr', 'settings'], featurePermissions: { logs: ['task_activity'], hr: ['edit'], settings: ['priorities', 'notifications'] } },
  ];
  for (const [si, start] of starts.entries()) for (let seed = 1; seed <= 25; seed++) {
    it(`bắt đầu #${si}, chuỗi ${seed}`, () => {
      const r = rng(seed * 31 + si);
      let v1: Row = { id: 'ckuser', ...structuredClone(start) };
      let v2: MenuPerm = structuredClone(start);
      for (let i = 0; i < 12; i++) {
        const m = MENU_CONFIG[Math.floor(r() * MENU_CONFIG.length)];
        // V1 chỉ cho bấm tính năng khi menu đang bật (ô bị khoá khi tắt)
        const f = m.features.length && v1MenuEnabled(v1, m.key) && r() < 0.6 ? m.features[Math.floor(r() * m.features.length)] : null;
        if (f) {
          const checked = !v1FeatureEnabled(v1, m.key, f.key);
          v1 = { id: v1.id, ...v1Feature(v1, m.key, f.key, checked) };
          v2 = toggleFeature(v2, m.key, f.key, checked);
        } else {
          const checked = !v1MenuEnabled(v1, m.key);
          v1 = { id: v1.id, ...v1Menu(v1, m.key, checked) };
          v2 = toggleMenu(v2, m.key, checked);
        }
        for (const mm of MENU_CONFIG) {
          expect(menuOn(v2, mm.key)).toBe(v1MenuEnabled(v1, mm.key));
          for (const ff of mm.features) expect(featureOn(v2, mm.key, ff.key)).toBe(v1FeatureEnabled(v1, mm.key, ff.key));
        }
      }
      const { id, ...v1Body } = v1;
      expect(JSON.stringify(savePayload('ckuser', v2))).toBe(JSON.stringify({ userId: id, ...v1Body }));
    });
  }
});

describe('đếm thay đổi / mặc định', () => {
  it('không đổi = 0', () => expect(changeCount(DEFAULT_PERM, structuredClone(DEFAULT_PERM))).toBe(0));
  it('tắt menu Nhật ký = 3 công tắc (menu + 2 tính năng)', () => {
    expect(changeCount(DEFAULT_PERM, toggleMenu(DEFAULT_PERM, 'logs', false))).toBe(3);
  });
  it('bật rồi tắt lại cùng 1 tính năng = 0', () => {
    const a = toggleFeature(DEFAULT_PERM, 'hr', 'edit', false);
    expect(changeCount(DEFAULT_PERM, toggleFeature(a, 'hr', 'edit', true))).toBe(0);
  });
  it('tính năng còn trong dữ liệu nhưng menu tắt thì không tính là bật (như V1)', () => {
    const p = { visibleMenus: [], featurePermissions: { hr: ['edit'] } };
    expect(featureOn(p, 'hr', 'edit')).toBe(false);
  });
  it('differsFromDefault', () => {
    expect(differsFromDefault(DEFAULT_PERM)).toBe(false);
    expect(differsFromDefault({ visibleMenus: ['settings'], featurePermissions: {} })).toBe(true);
  });
  it('số công tắc = 5 menu + 11 tính năng', () => expect(switchKeys()).toHaveLength(16));
});

describe('trang con V1 + tìm người', () => {
  it('mỗi trang con lọc đúng 1 menu', () => {
    for (const [seg, key] of Object.entries(PERM_ROUTE_MENU)) expect(menusFor(key).map((m) => m.key)).toEqual([key]);
    expect(PERM_ROUTE_MENU.users).toBe('hr');
    expect(menusFor(null)).toHaveLength(5);
  });
  it('tìm không dấu theo tên hoặc tên đăng nhập', () => {
    const u = { displayName: 'Đặng Thị Hằng', username: 'hang_dt' };
    expect(matchUser(u, 'dang thi')).toBe(true);
    expect(matchUser(u, 'HANG_')).toBe(true);
    expect(matchUser(u, 'lan')).toBe(false);
    expect(matchUser(u, '  ')).toBe(true);
  });
});
