import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  nestMessages,
  flattenMessages,
  diffKeySets,
  selectKeys,
  findIcuProblems,
  findPlaceholderMismatches,
  loadCopyDictionary,
  buildMessages,
  INCLUDE,
} from '../../../scripts/i18n/build-messages.mjs';

const ROOT = path.resolve(__dirname, '../../..');
const COPY = path.join(ROOT, 'docs/previews/ds-v2/copy.js');

describe('nestMessages — khoá phẳng "a.b.c" thành object lồng nhau', () => {
  it('lồng theo dấu chấm', () => {
    const { tree, renames } = nestMessages({ 'st.DRAFT': 'Nháp', 'due.in': 'Còn {n} ngày', 'app.close': 'Đóng' });
    expect(tree).toEqual({ st: { DRAFT: 'Nháp' }, due: { in: 'Còn {n} ngày' }, app: { close: 'Đóng' } });
    expect(renames).toEqual([]);
  });

  it('xung đột "a" và "a.b": giá trị của "a" chuyển sang "a._" và được ghi lại', () => {
    const { tree, renames } = nestMessages({ 'app.phaseB': 'Phase B', 'app.phaseB.d': 'Chưa có ở V1' });
    expect(tree).toEqual({ app: { phaseB: { _: 'Phase B', d: 'Chưa có ở V1' } } });
    expect(renames).toEqual([{ from: 'app.phaseB', to: 'app.phaseB._' }]);
  });

  it('xung đột không phụ thuộc thứ tự khoá', () => {
    const { tree, renames } = nestMessages({ 'pf.lang.vi': 'Tiếng Việt', 'pf.lang': 'Ngôn ngữ' });
    expect(tree).toEqual({ pf: { lang: { _: 'Ngôn ngữ', vi: 'Tiếng Việt' } } });
    expect(renames).toEqual([{ from: 'pf.lang', to: 'pf.lang._' }]);
  });

  it('khoá được sắp xếp → chạy lại cho cùng kết quả (idempotent)', () => {
    const a = nestMessages({ 'b.x': '1', 'a.y': '2', 'a.b': '3' }).tree;
    const b = nestMessages({ 'a.b': '3', 'a.y': '2', 'b.x': '1' }).tree;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(Object.keys(a)).toEqual(['a', 'b']);
  });

  it('flattenMessages là phép ngược (khoá đã quy đổi giữ dạng "a._")', () => {
    const flat = { 'app.phaseB': 'P', 'app.phaseB.d': 'D', 'st.DRAFT': 'Nháp' };
    expect(flattenMessages(nestMessages(flat).tree)).toEqual({ 'app.phaseB._': 'P', 'app.phaseB.d': 'D', 'st.DRAFT': 'Nháp' });
  });
});

describe('diffKeySets — phát hiện lệch khoá vi/en', () => {
  it('khớp → rỗng', () => {
    expect(diffKeySets({ a: { b: 'x' } }, { a: { b: 'y' } })).toEqual({ onlyVi: [], onlyEn: [] });
  });
  it('lệch → liệt kê khoá thiếu ở từng bên', () => {
    expect(diffKeySets({ a: { b: 'x', c: 'y' } }, { a: { b: 'x' }, d: 'z' })).toEqual({ onlyVi: ['a.c'], onlyEn: ['d'] });
  });
});

describe('selectKeys — chỉ lấy nhóm khoá được chọn', () => {
  const flat = { 'st.DRAFT': '1', 'set.title': '2', 'td.as.PENDING': '3', 'td.title': '4', 'stx.a': '5' };
  it('theo tiền tố nhóm (khớp đúng đoạn, "st" không ăn "stx") + theo tiền tố khoá cụ thể', () => {
    expect(selectKeys(flat, { groups: ['st'], prefixes: ['td.as.'] })).toEqual({ 'st.DRAFT': '1', 'td.as.PENDING': '3' });
  });
  it('bỏ các khoá theo tiền tố trong exclude (vd khoá điều khiển preview td.pv.*)', () => {
    expect(selectKeys(flat, { groups: ['td'], exclude: ['td.as.'] })).toEqual({ 'td.title': '4' });
  });
  it('A2-1: có nhóm td (chi tiết công việc) nhưng không lấy khoá preview / Phase B', () => {
    expect(INCLUDE.groups).toContain('td');
    expect(INCLUDE.exclude).toEqual(expect.arrayContaining(['td.pv.', 'td.cm.lock']));
  });
  it('INCLUDE có đủ các nhóm khung dùng chung', () => {
    for (const g of ['app', 'top', 'nav', 'st', 'pr', 'due', 'act', 'qa', 'role', 'filter', 'view', 'page', 'empty', 'notif', 'ago']) {
      expect(INCLUDE.groups).toContain(g);
    }
  });
});

describe('kiểm tra cú pháp ICU và placeholder', () => {
  it('phát hiện chuỗi hỏng cú pháp ICU', () => {
    expect(findIcuProblems({ ok: 'Còn {n} ngày', bad: 'Hỏng {n' })).toEqual([expect.objectContaining({ key: 'bad' })]);
  });
  it('phát hiện vi/en khác tập placeholder', () => {
    expect(findPlaceholderMismatches({ a: 'Còn {n} ngày', b: '{x}' }, { a: 'Due in {d}', b: '{x}' })).toEqual([
      { key: 'a', vi: ['n'], en: ['d'] },
    ]);
  });
});

describe('copy.js thật → messages', () => {
  it('đọc được từ điển preview, vi và en cùng tập khoá', () => {
    const { vi, en } = loadCopyDictionary(COPY);
    expect(Object.keys(vi).length).toBeGreaterThan(2000);
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
    expect(vi['st.PENDING_APPROVAL']).toBe('Chờ duyệt');
    expect(en['st.PENDING_APPROVAL']).toBe('Awaiting approval');
  });

  it('buildMessages: có nhóm dùng chung, không có khoá màn riêng, vi/en khớp, không lỗi ICU', () => {
    const r = buildMessages({ copyPath: COPY });
    expect(r.vi.st.PENDING_APPROVAL).toBe('Chờ duyệt');
    expect(r.en.due.overdue).toBe('{n}d overdue');
    expect(r.vi.set).toBeUndefined(); // khoá màn Cài đặt chưa đưa vào
    expect(r.vi.common.save).toBe('Lưu'); // giữ khoá cũ
    expect(diffKeySets(r.vi, r.en)).toEqual({ onlyVi: [], onlyEn: [] });
    expect(r.problems).toEqual([]);
  });

  it('messages/*.json trên đĩa đúng bằng kết quả build (đã chạy script)', () => {
    const r = buildMessages({ copyPath: COPY });
    const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages/vi.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages/en.json'), 'utf8'));
    expect(vi).toEqual(r.vi);
    expect(en).toEqual(r.en);
  });
});
