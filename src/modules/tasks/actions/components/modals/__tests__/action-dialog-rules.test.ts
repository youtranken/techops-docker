import { describe, it, expect } from 'vitest';
import {
  reasonError, reportError, attachmentError, extensionMinDate, extensionDateError,
  transferErrors, reworkErrors, reportNextStep, nextReportVersion, acceptProgress,
} from '../action-dialog-rules';
import { validateNewAttachments } from '@/modules/tasks/components/CreateTask/attachment-rules';

/**
 * Luật kiểm tra của hộp thoại hành động V2 = luật V1 (ReasonModal, CompleteTaskModal, SupplementReportModal,
 * RequestExtensionModal, TransferModal, RejectReviewModal, attachment-rules) — chỉ đổi cách hiện lỗi (khoá i18n).
 */
describe('reasonError — ReasonModal V1', () => {
  it('bắt buộc: rỗng hoặc chỉ khoảng trắng → lỗi', () => {
    expect(reasonError('', true)).toEqual({ key: 'app.dlg.reasonErr' });
    expect(reasonError('   \n', true)).toEqual({ key: 'app.dlg.reasonErr' });
  });
  it('bắt buộc: 1 ký tự là đủ (V1 không có tối thiểu ký tự)', () => {
    expect(reasonError('x', true)).toBeNull();
  });
  it('không bắt buộc: rỗng vẫn hợp lệ', () => {
    expect(reasonError('', false)).toBeNull();
  });
});

describe('reportError — Báo cáo / Bổ sung V1: length < 10 (tính cả khoảng trắng)', () => {
  it('9 ký tự → lỗi kèm số đếm', () => {
    expect(reportError('123456789')).toEqual({ key: 'app.dlg.minErr', values: { n: 9 } });
  });
  it('rỗng → lỗi n=0', () => {
    expect(reportError('')).toEqual({ key: 'app.dlg.minErr', values: { n: 0 } });
  });
  it('10 khoảng trắng vẫn qua như V1 (server mới chặn rỗng)', () => {
    expect(reportError('          ')).toBeNull();
  });
  it('10 ký tự → hợp lệ', () => {
    expect(reportError('0123456789')).toBeNull();
  });
});

const f = (name: string, mb = 1) => ({ name, size: Math.round(mb * 1024 * 1024) });

describe('attachmentError — attachment-rules V1 (3 tệp, 10 MB, PDF/JPG/PNG/DOCX/XLSX/PPTX, lỗi đầu tiên thì dừng)', () => {
  it('đã đủ 3 tệp → full', () => {
    expect(attachmentError([f('a.pdf')], 3)).toEqual({ key: 'tf.att.full', values: { n: 3 } });
  });
  it('chọn quá chỗ còn lại → max', () => {
    expect(attachmentError([f('a.pdf'), f('b.pdf')], 2)).toEqual({ key: 'tf.att.max', values: { n: 3, k: 2, r: 1 } });
  });
  it('kiểm số lượng trước định dạng', () => {
    expect(attachmentError([f('a.exe'), f('b.exe'), f('c.exe'), f('d.exe')], 0)?.key).toBe('tf.att.max');
  });
  it('sai định dạng → type (theo đuôi, không phân biệt hoa thường)', () => {
    expect(attachmentError([f('x.PNG'), f('virus.exe')], 0)).toEqual({ key: 'tf.att.type', values: { f: 'virus.exe' } });
  });
  it('quá 10 MB → size', () => {
    expect(attachmentError([f('big.pdf', 10.5)], 0)).toEqual({ key: 'tf.att.size', values: { f: 'big.pdf', s: '10,5 MB', m: 10 } });
    expect(attachmentError([f('big.pdf', 10.5)], 0, 'en')?.values?.s).toBe('10.5 MB');
  });
  it('đúng 10 MB → hợp lệ', () => {
    expect(attachmentError([f('ok.docx', 10)], 0)).toBeNull();
  });
  it('trùng kết quả hợp lệ/không hợp lệ với validateNewAttachments V1', () => {
    const cases: [ReturnType<typeof f>[], number][] = [
      [[f('a.pdf')], 0], [[f('a.pdf')], 3], [[f('a.jpeg'), f('b.xlsx')], 1], [[f('a.pptx'), f('b.txt')], 0],
      [[f('noext')], 0], [[f('a.png', 11)], 2], [[f('a.png', 9.9)], 2], [[f('a.png'), f('b.png'), f('c.png')], 1],
    ];
    for (const [list, have] of cases) {
      const v1 = validateNewAttachments(list.map((x) => ({ name: x.name, size: x.size }) as File), have);
      expect(attachmentError(list, have) === null, JSON.stringify([list, have])).toBe(v1 === null);
    }
  });
});

describe('extensionMinDate / extensionDateError — RequestExtensionModal V1 (min = hạn + 1 ngày)', () => {
  it('min = hạn hiện tại + 1 ngày (công thức V1: toISOString().slice(0,10))', () => {
    expect(extensionMinDate('2026-10-28T00:00:00.000Z')).toBe('2026-10-29');
    expect(extensionMinDate(new Date('2026-12-31T00:00:00.000Z'))).toBe('2027-01-01');
  });
  it('chưa chọn ngày → lỗi bắt buộc', () => {
    expect(extensionDateError('', '2026-10-28T00:00:00.000Z')).toEqual({ key: 'tdx.dlg.ext.dateReq' });
  });
  it('ngày ≤ hạn hiện tại → lỗi, kèm ngày tối thiểu', () => {
    expect(extensionDateError('2026-10-28', '2026-10-28T00:00:00.000Z')).toEqual({ key: 'tdx.dlg.ext.dateErr', values: { d: '2026-10-29' } });
  });
  it('ngày ≥ min → hợp lệ', () => {
    expect(extensionDateError('2026-10-29', '2026-10-28T00:00:00.000Z')).toBeNull();
  });
});

describe('transferErrors — TransferModal V1 (người nhận + ghi chú không rỗng)', () => {
  it('thiếu cả hai', () => {
    expect(transferErrors('', ' ')).toEqual({ to: { key: 'app.dlg.tr.err' }, notes: { key: 'app.dlg.tr.noteErr' } });
  });
  it('đủ', () => {
    expect(transferErrors('u1', 'bàn giao')).toEqual({ to: null, notes: null });
  });
});

describe('reworkErrors — RejectReviewModal V1 (≥1 người, lý do từng người không rỗng)', () => {
  it('không chọn ai → lỗi chọn', () => {
    expect(reworkErrors([], {})).toEqual({ pick: { key: 'app.dlg.rework.errPick' }, reasons: {}, ok: false });
  });
  it('người đã chọn thiếu lý do → lỗi đúng người đó', () => {
    expect(reworkErrors(['a', 'b'], { a: 'sửa lại', b: '  ' })).toEqual({ pick: null, reasons: { b: { key: 'app.dlg.reasonErr' } }, ok: false });
  });
  it('đủ', () => {
    expect(reworkErrors(['a'], { a: 'x', b: '' }).ok).toBe(true);
  });
});

const as = (id: string, status: string) => ({ status, user: { id } });

describe('reportNextStep — lifecycle.service complete() V1', () => {
  it('còn người làm hiệu lực chưa báo cáo → wait(n)', () => {
    expect(reportNextStep({ workflowMode: 'NEED_APPROVAL', viewerId: 'me', assignees: [as('me', 'IN_PROGRESS'), as('b', 'IN_PROGRESS'), as('c', 'PENDING'), as('d', 'COMPLETED')] }))
      .toEqual({ key: 'app.dlg.next.wait', values: { n: 2 } });
  });
  it('người TRANSFERRED / REJECTED không tính', () => {
    expect(reportNextStep({ workflowMode: 'IMMEDIATE', viewerId: 'me', assignees: [as('me', 'IN_PROGRESS'), as('b', 'TRANSFERRED'), as('c', 'REJECTED')] }))
      .toEqual({ key: 'app.dlg.next.direct' });
  });
  it('Phê duyệt, mình là người cuối → Chờ nghiệm thu', () => {
    expect(reportNextStep({ workflowMode: 'NEED_APPROVAL', viewerId: 'me', assignees: [as('me', 'IN_PROGRESS'), as('b', 'COMPLETED')] }))
      .toEqual({ key: 'app.dlg.next.approval' });
  });
  it('Trực tiếp nhưng mình đang "Cần làm lại" → vẫn Chờ nghiệm thu', () => {
    expect(reportNextStep({ workflowMode: 'IMMEDIATE', viewerId: 'me', assignees: [as('me', 'REVISION_REQUIRED')] }))
      .toEqual({ key: 'app.dlg.next.approval' });
  });
  it('không xác định được mình / thiếu dữ liệu → null (không hiện ghi chú)', () => {
    expect(reportNextStep({ workflowMode: 'IMMEDIATE', viewerId: 'x', assignees: [as('me', 'IN_PROGRESS')] })).toBeNull();
    expect(reportNextStep({ workflowMode: undefined, viewerId: 'me', assignees: [as('me', 'IN_PROGRESS')] })).toBeNull();
  });
});

describe('nextReportVersion — complete: major+1 .0; supplement: giữ major, minor+1', () => {
  const r = (version: number, minorVersion: number) => ({ version, minorVersion });
  it('chưa có báo cáo', () => {
    expect(nextReportVersion([], 'complete')).toBe('v1.0');
    expect(nextReportVersion([], 'supplement')).toBe('v1.1');
  });
  it('lấy bản lớn nhất bất kể thứ tự', () => {
    expect(nextReportVersion([r(2, 0), r(1, 3), r(2, 1)], 'complete')).toBe('v3.0');
    expect(nextReportVersion([r(2, 0), r(1, 3), r(2, 1)], 'supplement')).toBe('v2.2');
  });
});

describe('acceptProgress — acknowledge.service: mỗi người tự nhận phần mình', () => {
  it('1 người làm → null', () => {
    expect(acceptProgress([as('a', 'PENDING')])).toBeNull();
  });
  it('n người hiệu lực, x đã nhận (bỏ REJECTED/TRANSFERRED)', () => {
    expect(acceptProgress([as('a', 'PENDING'), as('b', 'IN_PROGRESS'), as('c', 'COMPLETED'), as('d', 'REJECTED'), as('e', 'TRANSFERRED')]))
      .toEqual({ n: 3, x: 2 });
  });
});
