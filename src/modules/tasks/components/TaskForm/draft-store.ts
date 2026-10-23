/**
 * Nháp "Tạo công việc" — CHỈ lưu trong localStorage của trình duyệt (Phase B: V1 không có luồng DRAFT phía server,
 * `task-create.service.ts` không bao giờ tạo việc DRAFT). Nháp KHÔNG phải công việc: không mã, không vào DB.
 *
 * - Mỗi user một khoá `techops.taskDrafts:<userId>` → `{ v: DRAFT_VERSION, items: TaskDraft[] }`.
 * - Chỉ lưu các trường form (DraftFields); tệp/ảnh KHÔNG lưu (File không tuần tự hoá được).
 * - Mọi truy cập bọc try/catch: storage bị chặn/đầy/JSON hỏng/khác version → coi như chưa có nháp, không ném lỗi.
 * Hàm thuần (storage truyền vào được) → test ở `__tests__/draft-store.test.ts`.
 */
export const DRAFT_VERSION = 1;

export interface DraftFields {
  title: string;
  /** HTML của ô mô tả */
  content: string;
  workflowMode: 'IMMEDIATE' | 'NEED_APPROVAL';
  assigneeIds: string[];
  priorityId: string;
  typeId: string;
  scheduleStart: string;
  scheduleEnd: string;
  isForceMode: boolean;
  isImportant: boolean;
}
export interface TaskDraft { id: string; ts: number; f: DraftFields }
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const draftKey = (userId: string) => `techops.taskDrafts:${userId}`;

export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
/** Chỉ giữ đúng các trường form, đúng kiểu (bỏ mọi thứ khác — vd tệp). */
export function sanitizeFields(raw: unknown): DraftFields {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    title: str(o.title),
    content: str(o.content),
    workflowMode: o.workflowMode === 'NEED_APPROVAL' ? 'NEED_APPROVAL' : 'IMMEDIATE',
    assigneeIds: Array.isArray(o.assigneeIds) ? o.assigneeIds.filter((x): x is string => typeof x === 'string' && !!x) : [],
    priorityId: str(o.priorityId),
    typeId: str(o.typeId),
    scheduleStart: str(o.scheduleStart),
    scheduleEnd: str(o.scheduleEnd),
    isForceMode: o.isForceMode === true,
    isImportant: o.isImportant === true,
  };
}

/** null = storage không đọc được (bị chặn/lỗi); [] = chưa có nháp / dữ liệu hỏng / khác version. */
function read(userId: string, storage: StorageLike | null | undefined): TaskDraft[] | null {
  if (!userId || !storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(draftKey(userId));
  } catch {
    return null;
  }
  if (!raw) return [];
  try {
    const box = JSON.parse(raw) as { v?: unknown; items?: unknown };
    if (!box || typeof box !== 'object' || box.v !== DRAFT_VERSION || !Array.isArray(box.items)) return [];
    const out: TaskDraft[] = [];
    for (const it of box.items as unknown[]) {
      if (!it || typeof it !== 'object') continue;
      const d = it as Record<string, unknown>;
      if (typeof d.id !== 'string' || !d.id || typeof d.ts !== 'number') continue;
      out.push({ id: d.id, ts: d.ts, f: sanitizeFields(d.f) });
    }
    return out;
  } catch {
    return [];
  }
}

function write(userId: string, items: TaskDraft[], storage: StorageLike | null | undefined): boolean {
  if (!userId || !storage) return false;
  try {
    if (items.length) storage.setItem(draftKey(userId), JSON.stringify({ v: DRAFT_VERSION, items }));
    else storage.removeItem(draftKey(userId));
    return true;
  } catch {
    return false;
  }
}

export function listDrafts(userId: string, storage: StorageLike | null | undefined = browserStorage()): TaskDraft[] {
  return (read(userId, storage) ?? []).sort((a, b) => b.ts - a.ts);
}

export function getDraft(userId: string, id: string, storage: StorageLike | null | undefined = browserStorage()): TaskDraft | null {
  return (read(userId, storage) ?? []).find((d) => d.id === id) ?? null;
}

export function saveDraft(
  userId: string,
  fields: DraftFields,
  opts: { id?: string | null; now?: number; storage?: StorageLike | null } = {},
): TaskDraft | null {
  const storage = 'storage' in opts ? opts.storage : browserStorage();
  if (!userId || !storage) return null;
  const now = opts.now ?? Date.now();
  const id = opts.id || `d${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const d: TaskDraft = { id, ts: now, f: sanitizeFields(fields) };
  const items = (read(userId, storage) ?? []).filter((x) => x.id !== id);
  items.push(d);
  return write(userId, items, storage) ? d : null;
}

export function removeDraft(userId: string, id: string, storage: StorageLike | null | undefined = browserStorage()): boolean {
  if (!userId || !storage) return false;
  const items = read(userId, storage);
  if (!items) return false;
  const next = items.filter((x) => x.id !== id);
  if (next.length === items.length) return true;
  return write(userId, next, storage);
}
