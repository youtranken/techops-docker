/**
 * Luật nhập + body gửi server cho 3 danh mục của Cài đặt (A3-7): Mức ưu tiên, Loại công việc, Mẫu hoàn thành.
 * Luật = đúng zod của route V1 (src/app/api/settings/{priorities,task-types,completion-templates}); body = đúng V1
 * (test đối chiếu `__tests__/v1-settings.fixture.ts`). Hai chỗ khác V1 là sửa lỗi, đã ghi trong test:
 *  - Loại công việc, khi SỬA: mô tả xoá trống gửi "" (V1 bỏ trường → mô tả cũ không xoá được).
 *  - Mẫu hoàn thành, khi TẠO: danh mục trống thì bỏ trường (V1 gửi null → route tạo trả 400).
 */
export interface FieldError {
  key: string;
  values?: Record<string, string | number>;
}
export type FormErrors<K extends string> = Partial<Record<K, FieldError>>;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const INT = /^-?\d+$/;
const req = (): FieldError => ({ key: 'set.v.req' });
const max = (n: number): FieldError => ({ key: 'setx.v.max', values: { n } });
const dup = (): FieldError => ({ key: 'set.v.dup' });

/** Tên trùng: cột `name` @unique (so khớp chính xác như DB) — V1 để server lỗi 500, V2 báo ngay dưới ô */
function isDup(name: string, existing: { id: string; name: string }[], selfId?: string) {
  return existing.some((x) => x.id !== selfId && x.name === name);
}

// ── Mức ưu tiên ──
export interface PriorityForm { name: string; color: string; level: string; isDefault: boolean }
export type PriorityField = 'name' | 'color' | 'level';

export function priorityFormFrom(p?: { name: string; color: string; level: number; isDefault: boolean }): PriorityForm {
  return { name: p?.name ?? '', color: p?.color ?? '#3B82F6', level: String(p?.level ?? 2), isDefault: p?.isDefault ?? false };
}

export function validatePriority(f: PriorityForm, existing: { id: string; name: string }[], selfId?: string): FormErrors<PriorityField> {
  const e: FormErrors<PriorityField> = {};
  if (f.name.length === 0) e.name = req();
  else if (f.name.length > 50) e.name = max(50);
  else if (isDup(f.name, existing, selfId)) e.name = dup();
  if (!HEX.test(f.color)) e.color = { key: 'set.v.hex' };
  const lv = Number(f.level);
  if (!INT.test(f.level.trim()) || lv < 1 || lv > 10) e.level = { key: 'set.v.range', values: { a: 1, b: 10 } };
  return e;
}

/** V1 PriorityForm: onSave({ name, color, level, isDefault }) — tên giữ nguyên như gõ */
export function priorityBody(f: PriorityForm) {
  return { name: f.name, color: f.color, level: Number(f.level), isDefault: f.isDefault };
}

// ── Loại công việc ──
export interface TaskTypeForm { name: string; icon: string; description: string }
export type TaskTypeField = 'name' | 'description';

export function taskTypeFormFrom(t?: { name: string; icon: string; description?: string | null }): TaskTypeForm {
  return { name: t?.name ?? '', icon: t?.icon ?? 'Wrench', description: t?.description ?? '' };
}

export function validateTaskType(f: TaskTypeForm, existing: { id: string; name: string }[], selfId?: string): FormErrors<TaskTypeField> {
  const e: FormErrors<TaskTypeField> = {};
  if (f.name.length === 0) e.name = req();
  else if (f.name.length > 50) e.name = max(50);
  else if (isDup(f.name, existing, selfId)) e.name = dup();
  if (f.description.length > 255) e.description = max(255);
  return e;
}

/** V1: { name, icon, color: '#6B7280', description: description || undefined } (màu cố định, kể cả khi sửa) */
export function taskTypeBody(f: TaskTypeForm, mode: 'create' | 'edit') {
  const body: { name: string; icon: string; color: string; description?: string } = { name: f.name, icon: f.icon, color: '#6B7280' };
  if (f.description) body.description = f.description;
  else if (mode === 'edit') body.description = '';
  return body;
}

// ── Mẫu hoàn thành ──
export interface TemplateForm { title: string; content: string; category: string; taskTypeId: string; isActive: boolean }
export type TemplateField = 'title' | 'content' | 'category';

export function templateFormFrom(t?: { title: string; content: string; category: string | null; taskTypeId: string | null; isActive: boolean }): TemplateForm {
  return { title: t?.title ?? '', content: t?.content ?? '', category: t?.category ?? '', taskTypeId: t?.taskTypeId ?? '', isActive: t?.isActive ?? true };
}

export function validateTemplate(f: TemplateForm): FormErrors<TemplateField> {
  const e: FormErrors<TemplateField> = {};
  const title = f.title.trim();
  const content = f.content.trim();
  if (!title) e.title = req();
  else if (title.length > 200) e.title = max(200);
  if (!content) e.content = req();
  else if (content.length > 5000) e.content = max(5000);
  if (f.category.trim().length > 100) e.category = max(100);
  return e;
}

/** V1 ReportTemplatesSection.toInput (cắt khoảng trắng; trống → null) */
export function templateBody(f: TemplateForm, mode: 'create' | 'edit') {
  const category = f.category.trim() || null;
  const body: { title: string; content: string; category?: string | null; taskTypeId: string | null; isActive: boolean } = {
    title: f.title.trim(),
    content: f.content.trim(),
    category,
    taskTypeId: f.taskTypeId || null,
    isActive: f.isActive,
  };
  if (mode === 'create' && category === null) delete body.category;
  return body;
}
