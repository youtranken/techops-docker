import { describe, it, expect, beforeEach } from 'vitest';
import {
  listDrafts, getDraft, saveDraft, removeDraft, draftKey, DRAFT_VERSION, type DraftFields, type StorageLike,
} from '../draft-store';

class MemStorage implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
}
const throwing: StorageLike = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
  removeItem() { throw new Error('SecurityError'); },
};

const F = (o: Partial<DraftFields> = {}): DraftFields => ({
  title: '[E2E] Nháp', content: '<p>Mô tả</p>', workflowMode: 'IMMEDIATE', assigneeIds: ['u1'],
  priorityId: 'p1', typeId: 't1', scheduleStart: '2026-10-23', scheduleEnd: '', isForceMode: false, isImportant: false, ...o,
});

let s: MemStorage;
beforeEach(() => { s = new MemStorage(); });

describe('draft-store — nháp chỉ lưu localStorage, theo user', () => {
  it('lưu → đọc lại đúng dữ liệu, có id + thời gian', () => {
    const d = saveDraft('u1', F(), { storage: s, now: 1000 });
    expect(d).not.toBeNull();
    expect(d!.id).toMatch(/^d/);
    expect(d!.ts).toBe(1000);
    expect(getDraft('u1', d!.id, s)).toEqual(d);
    expect(listDrafts('u1', s)).toEqual([d]);
  });
  it('lưu lại cùng id → ghi đè, cập nhật thời gian, không nhân bản', () => {
    const d = saveDraft('u1', F(), { storage: s, now: 1000 })!;
    const d2 = saveDraft('u1', F({ title: 'Mới' }), { id: d.id, storage: s, now: 2000 })!;
    expect(d2.id).toBe(d.id);
    expect(listDrafts('u1', s)).toHaveLength(1);
    expect(getDraft('u1', d.id, s)!.f.title).toBe('Mới');
    expect(getDraft('u1', d.id, s)!.ts).toBe(2000);
  });
  it('danh sách xếp mới nhất trước', () => {
    const a = saveDraft('u1', F({ title: 'A' }), { storage: s, now: 1000 })!;
    const b = saveDraft('u1', F({ title: 'B' }), { storage: s, now: 3000 })!;
    expect(listDrafts('u1', s).map((x) => x.id)).toEqual([b.id, a.id]);
  });
  it('xoá', () => {
    const d = saveDraft('u1', F(), { storage: s, now: 1 })!;
    expect(removeDraft('u1', d.id, s)).toBe(true);
    expect(getDraft('u1', d.id, s)).toBeNull();
    expect(listDrafts('u1', s)).toEqual([]);
  });
  it('mỗi user một khoá riêng: user khác không thấy, không xoá được', () => {
    const d = saveDraft('u1', F(), { storage: s, now: 1 })!;
    expect(listDrafts('u2', s)).toEqual([]);
    expect(getDraft('u2', d.id, s)).toBeNull();
    removeDraft('u2', d.id, s);
    expect(getDraft('u1', d.id, s)).not.toBeNull();
    expect(draftKey('u1')).not.toBe(draftKey('u2'));
    expect([...s.m.keys()]).toEqual([draftKey('u1')]);
  });
  it('không có user → không lưu', () => {
    expect(saveDraft('', F(), { storage: s })).toBeNull();
    expect(s.m.size).toBe(0);
    expect(listDrafts('', s)).toEqual([]);
  });
  it('không lưu tệp/ảnh: chỉ các trường form', () => {
    const d = saveDraft('u1', { ...F(), files: [{ name: 'a.png' }] } as unknown as DraftFields, { storage: s, now: 1 })!;
    expect(Object.keys(d.f).sort()).toEqual(Object.keys(F()).sort());
    expect(s.m.get(draftKey('u1'))).not.toContain('a.png');
  });
  it('JSON hỏng → coi như chưa có nháp; lưu mới vẫn được', () => {
    s.setItem(draftKey('u1'), '{hỏng');
    expect(listDrafts('u1', s)).toEqual([]);
    expect(getDraft('u1', 'x', s)).toBeNull();
    expect(saveDraft('u1', F(), { storage: s, now: 1 })).not.toBeNull();
    expect(listDrafts('u1', s)).toHaveLength(1);
  });
  it('khác version → bỏ qua dữ liệu cũ', () => {
    s.setItem(draftKey('u1'), JSON.stringify({ v: DRAFT_VERSION + 1, items: [{ id: 'd1', ts: 1, f: F() }] }));
    expect(listDrafts('u1', s)).toEqual([]);
    s.setItem(draftKey('u1'), JSON.stringify([{ id: 'd1' }]));
    expect(listDrafts('u1', s)).toEqual([]);
  });
  it('mục nháp sai hình dạng bị loại, trường thiếu được điền mặc định an toàn', () => {
    s.setItem(draftKey('u1'), JSON.stringify({ v: DRAFT_VERSION, items: [
      { id: 'd1', ts: 5, f: { title: 'Chỉ tiêu đề', assigneeIds: ['a', 3] } },
      { id: 2, ts: 1, f: {} },
      null,
    ] }));
    const all = listDrafts('u1', s);
    expect(all).toHaveLength(1);
    expect(all[0].f).toEqual({
      title: 'Chỉ tiêu đề', content: '', workflowMode: 'IMMEDIATE', assigneeIds: ['a'], priorityId: '', typeId: '',
      scheduleStart: '', scheduleEnd: '', isForceMode: false, isImportant: false,
    });
  });
  it('localStorage ném lỗi (chặn, đầy) → không vỡ', () => {
    expect(listDrafts('u1', throwing)).toEqual([]);
    expect(getDraft('u1', 'd1', throwing)).toBeNull();
    expect(saveDraft('u1', F(), { storage: throwing })).toBeNull();
    expect(removeDraft('u1', 'd1', throwing)).toBe(false);
  });
  it('không có localStorage (server) → không vỡ', () => {
    expect(listDrafts('u1', null)).toEqual([]);
    expect(saveDraft('u1', F(), { storage: null })).toBeNull();
  });
});
