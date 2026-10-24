import { describe, it, expect } from 'vitest';
import {
  priorityFormFrom, validatePriority, priorityBody,
  taskTypeFormFrom, validateTaskType, taskTypeBody,
  templateFormFrom, validateTemplate, templateBody,
  type PriorityForm, type TemplateForm,
} from '../catalog-forms';
import {
  v1PriorityCreate, v1PriorityUpdate, v1PriorityBody, v1TaskTypeCreate, v1TaskTypeUpdate, v1TaskTypeBody,
  v1TemplateCreate, v1TemplateUpdate, v1TemplateBody,
} from './v1-settings.fixture';

const CUID = 'cm0abcdefghijklmnopqrstu';

describe('Mức ưu tiên', () => {
  it('form mặc định giống PriorityForm V1 (#3B82F6, mức 2, không mặc định)', () => {
    expect(priorityFormFrom()).toEqual({ name: '', color: '#3B82F6', level: '2', isDefault: false });
    expect(priorityFormFrom({ name: 'Cao', color: '#F97316', level: 3, isDefault: true })).toEqual({ name: 'Cao', color: '#F97316', level: '3', isDefault: true });
  });

  it('body POST/PATCH giống hệt V1 { name, color, level, isDefault } — tên KHÔNG cắt khoảng trắng', () => {
    const f: PriorityForm = { name: ' Khẩn ', color: '#EF4444', level: '4', isDefault: true };
    expect(priorityBody(f)).toEqual(v1PriorityBody(f));
    expect(JSON.stringify(priorityBody(f))).toBe(JSON.stringify(v1PriorityBody(f)));
  });

  const cases: PriorityForm[] = [
    { name: 'A', color: '#000000', level: '1', isDefault: false },
    { name: '', color: '#000000', level: '1', isDefault: false },
    { name: ' ', color: '#abcdef', level: '10', isDefault: false },
    { name: 'x'.repeat(50), color: '#ABCDEF', level: '5', isDefault: true },
    { name: 'x'.repeat(51), color: '#ABCDEF', level: '5', isDefault: true },
    { name: 'A', color: '#abc', level: '2', isDefault: false },
    { name: 'A', color: 'red', level: '2', isDefault: false },
    { name: 'A', color: '#12345G', level: '2', isDefault: false },
    { name: 'A', color: '#123456', level: '0', isDefault: false },
    { name: 'A', color: '#123456', level: '11', isDefault: false },
    { name: 'A', color: '#123456', level: '', isDefault: false },
    { name: 'A', color: '#123456', level: '2.5', isDefault: false },
    { name: 'A', color: '#123456', level: '-1', isDefault: false },
    { name: 'A', color: '#123456', level: 'abc', isDefault: false },
  ];
  it.each(cases)('luật nhập khớp zod route V1 (tạo + sửa): %j', (f) => {
    const ok = Object.keys(validatePriority(f, [])).length === 0;
    expect(ok).toBe(v1PriorityCreate.safeParse(v1PriorityBody(f)).success);
    expect(ok).toBe(v1PriorityUpdate.safeParse(v1PriorityBody(f)).success);
  });

  it('báo lỗi theo từng ô với khoá i18n', () => {
    const e = validatePriority({ name: '', color: 'x', level: '0', isDefault: false }, []);
    expect(e.name?.key).toBe('set.v.req');
    expect(e.color?.key).toBe('set.v.hex');
    expect(e.level).toEqual({ key: 'set.v.range', values: { a: 1, b: 10 } });
    expect(validatePriority({ name: 'x'.repeat(51), color: '#000000', level: '1', isDefault: false }, []).name?.key).toBe('setx.v.max');
  });

  it('trùng tên (cột name @unique, so khớp đúng như DB) → báo trước thay vì để server lỗi 500; bỏ qua chính nó khi sửa', () => {
    const list = [{ id: 'p1', name: 'Cao' }, { id: 'p2', name: 'Thấp' }];
    expect(validatePriority({ name: 'Cao', color: '#000000', level: '1', isDefault: false }, list).name?.key).toBe('set.v.dup');
    expect(validatePriority({ name: 'cao', color: '#000000', level: '1', isDefault: false }, list).name).toBeUndefined();
    expect(validatePriority({ name: 'Cao', color: '#000000', level: '1', isDefault: false }, list, 'p1').name).toBeUndefined();
  });
});

describe('Loại công việc', () => {
  it('form mặc định giống TaskTypeForm V1 (icon Wrench)', () => {
    expect(taskTypeFormFrom()).toEqual({ name: '', icon: 'Wrench', description: '' });
    expect(taskTypeFormFrom({ name: 'Mạng', icon: 'Globe', description: null })).toEqual({ name: 'Mạng', icon: 'Globe', description: '' });
  });

  it('body TẠO giống hệt V1 (màu cố định #6B7280, mô tả rỗng → bỏ)', () => {
    for (const f of [{ name: 'Mạng ', icon: 'Globe', description: '' }, { name: 'A', icon: 'Cpu', description: 'mô tả' }]) {
      expect(JSON.stringify(taskTypeBody(f, 'create'))).toBe(JSON.stringify(v1TaskTypeBody(f)));
    }
  });

  it('body SỬA giống V1, riêng mô tả xoá trống gửi "" (sửa lỗi V1: không xoá được mô tả)', () => {
    const f = { name: 'A', icon: 'Cpu', description: 'x' };
    expect(JSON.stringify(taskTypeBody(f, 'edit'))).toBe(JSON.stringify(v1TaskTypeBody(f)));
    const cleared = { name: 'A', icon: 'Cpu', description: '' };
    expect(v1TaskTypeBody(cleared)).not.toHaveProperty('description'); // V1: mô tả cũ giữ nguyên
    expect(taskTypeBody(cleared, 'edit')).toEqual({ name: 'A', icon: 'Cpu', color: '#6B7280', description: '' });
    expect(v1TaskTypeUpdate.safeParse(taskTypeBody(cleared, 'edit')).success).toBe(true);
  });

  it.each([
    { name: 'A', icon: 'Cpu', description: '' },
    { name: '', icon: 'Cpu', description: '' },
    { name: 'x'.repeat(51), icon: 'Cpu', description: '' },
    { name: 'A', icon: 'Cpu', description: 'd'.repeat(255) },
    { name: 'A', icon: 'Cpu', description: 'd'.repeat(256) },
  ])('luật nhập khớp zod route V1: %j', (f) => {
    const ok = Object.keys(validateTaskType(f, [])).length === 0;
    expect(ok).toBe(v1TaskTypeCreate.safeParse(taskTypeBody(f, 'create')).success);
    expect(ok).toBe(v1TaskTypeUpdate.safeParse(taskTypeBody(f, 'edit')).success);
  });

  it('trùng tên → set.v.dup (bỏ qua chính nó)', () => {
    const list = [{ id: 't1', name: 'Mạng' }];
    expect(validateTaskType({ name: 'Mạng', icon: 'Cpu', description: '' }, list).name?.key).toBe('set.v.dup');
    expect(validateTaskType({ name: 'Mạng', icon: 'Cpu', description: '' }, list, 't1').name).toBeUndefined();
  });
});

describe('Mẫu hoàn thành', () => {
  const base: TemplateForm = { title: ' Báo cáo ', content: ' Đã làm: ', category: ' Kỹ thuật ', taskTypeId: CUID, isActive: true };

  it('form từ dữ liệu giống toFormState V1', () => {
    expect(templateFormFrom()).toEqual({ title: '', content: '', category: '', taskTypeId: '', isActive: true });
    expect(templateFormFrom({ title: 'T', content: 'C', category: null, taskTypeId: null, isActive: false }))
      .toEqual({ title: 'T', content: 'C', category: '', taskTypeId: '', isActive: false });
  });

  it('body SỬA giống hệt toInput V1', () => {
    for (const f of [base, { ...base, category: '  ', taskTypeId: '' }]) {
      expect(templateBody(f, 'edit')).toEqual(v1TemplateBody(f));
    }
  });

  it('body TẠO giống V1, riêng danh mục trống thì bỏ hẳn (sửa lỗi V1: gửi null → route trả 400)', () => {
    expect(templateBody(base, 'create')).toEqual(v1TemplateBody(base));
    const noCat = { ...base, category: '' };
    expect(v1TemplateCreate.safeParse(v1TemplateBody(noCat)).success).toBe(false); // lỗi V1 tái hiện
    const body = templateBody(noCat, 'create');
    expect(body).not.toHaveProperty('category');
    expect(v1TemplateCreate.safeParse(body).success).toBe(true);
  });

  it.each<TemplateForm>([
    base,
    { ...base, title: '   ' },
    { ...base, content: '' },
    { ...base, title: 'x'.repeat(200) },
    { ...base, title: 'x'.repeat(201) },
    { ...base, content: 'c'.repeat(5000) },
    { ...base, content: ' ' + 'c'.repeat(5000) + ' ' },
    { ...base, content: 'c'.repeat(5001) },
    { ...base, category: 'k'.repeat(100) },
    { ...base, category: 'k'.repeat(101) },
    { ...base, taskTypeId: '' },
  ])('luật nhập khớp zod route V1 (tạo + sửa): %#', (f) => {
    const ok = Object.keys(validateTemplate(f)).length === 0;
    expect(ok).toBe(v1TemplateCreate.safeParse(templateBody(f, 'create')).success);
    expect(ok).toBe(v1TemplateUpdate.safeParse(templateBody(f, 'edit')).success);
  });
});
