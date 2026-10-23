// @vitest-environment jsdom
/**
 * Hộp thoại hành động V2 (A2-2): mỗi hộp gọi onConfirm với ĐÚNG payload như V1 (mutation/endpoint giữ nguyên),
 * luật kiểm tra V1 hiện lỗi inline, nút đóng luôn là "Đóng".
 */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@/test/intl';
import { ReasonModal } from '../ReasonModal';
import { ConfirmActionModal } from '../ConfirmActionModal';
import { CompleteTaskModal } from '../CompleteTaskModal';
import { SupplementReportModal } from '../SupplementReportModal';
import { TransferModal } from '../TransferModal';
import { ReassignModal } from '../ReassignModal';
import { RejectReviewModal } from '../RejectReviewModal';
import { RequestExtensionModal } from '../RequestExtensionModal';
import { ApproveExtensionModal } from '../ApproveExtensionModal';

vi.mock('@/modules/tasks/hooks/useAssignableUsers', () => ({
  useAssignableUsers: () => ({
    data: { data: [
      { id: 'me', displayName: 'Tôi', username: 'me', role: { name: 'EMPLOYEE' } },
      { id: 'a1', displayName: 'Đang trong việc', username: 'a1', role: { name: 'EMPLOYEE' } },
      { id: 'u2', displayName: 'Trần Hai', username: 'u2', role: { name: 'EMPLOYEE' } },
      { id: 'u3', displayName: 'Lê Ba', username: 'u3', role: { name: 'BOSS' } },
    ] },
  }),
}));
vi.mock('@/modules/hr/hooks/useUsers', () => ({
  useUsers: () => ({ data: { data: [
    { id: 'x1', displayName: 'Người Một' }, { id: 'x2', displayName: 'Người Hai' }, { id: 'x3', displayName: 'Người Ba' },
  ] } }),
}));

const TASK = { code: '26-0033', title: 'Thay ổ cứng máy chủ' };

function withQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
const footerButtons = () => screen.getAllByRole('button').filter((b) => b.closest('[data-slot="dlg-footer"]')).map((b) => b.textContent);

describe('ReasonModal', () => {
  it('bắt buộc: rỗng → lỗi inline, không gọi; có lý do → onConfirm(lý do đã trim)', () => {
    const onConfirm = vi.fn();
    render(<ReasonModal open onClose={() => {}} onConfirm={onConfirm} title="Từ chối nhận việc?" confirmLabel="Từ chối" required task={TASK} />);
    expect(footerButtons()).toEqual(['Đóng', 'Từ chối']);
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Nhập lý do.')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  đang bận việc khác  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    expect(onConfirm).toHaveBeenCalledWith('đang bận việc khác');
  });

  it('không bắt buộc (Từ chối kế hoạch ở chi tiết V1): rỗng vẫn gửi ""', () => {
    const onConfirm = vi.fn();
    render(<ReasonModal open onClose={() => {}} onConfirm={onConfirm} title="Từ chối kế hoạch?" confirmLabel="Từ chối kế hoạch" danger />);
    expect(screen.getByText(/không bắt buộc/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối kế hoạch' }));
    expect(onConfirm).toHaveBeenCalledWith('');
  });
});

describe('ConfirmActionModal', () => {
  it('[Đóng][Duyệt] → onConfirm()', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmActionModal open onClose={onClose} onConfirm={onConfirm} title="Duyệt công việc này?" description="Mô tả" confirmLabel="Duyệt" task={TASK} />);
    expect(footerButtons()).toEqual(['Đóng', 'Duyệt']);
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    expect(onConfirm).toHaveBeenCalledWith();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('CompleteTaskModal (báo cáo hoàn thành)', () => {
  const origFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ data: [
      { id: 't1', title: 'Mẫu sửa máy', content: 'Đã thay linh kiện và chạy thử ổn định.', category: 'Phần cứng' },
    ] }), { status: 200 })) as typeof fetch;
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it('chọn mẫu → điền nội dung; Gửi → onConfirm(nội dung, tệp) như V1', async () => {
    const onConfirm = vi.fn();
    withQuery(<CompleteTaskModal taskId="task1" open onClose={() => {}} onConfirm={onConfirm} task={TASK} />);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/tasks/task1/completion-templates');
    const sel = await screen.findByRole('combobox', { name: /Mẫu hoàn thành/ });
    await waitFor(() => expect(screen.getByRole('option', { name: '[Phần cứng] Mẫu sửa máy' })).toBeInTheDocument());
    fireEvent.change(sel, { target: { value: 't1' } });
    const ta = screen.getByRole('textbox', { name: /Nội dung báo cáo/ });
    expect(ta).toHaveValue('Đã thay linh kiện và chạy thử ổn định.');

    const file = new File(['%PDF'], 'bien-ban.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('att-input'), { target: { files: [file] } });
    expect(screen.getByText('bien-ban.pdf')).toBeInTheDocument();

    expect(footerButtons()).toEqual(['Đóng', 'Gửi báo cáo']);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [content, files] = onConfirm.mock.calls[0];
    expect(content).toBe('Đã thay linh kiện và chạy thử ổn định.');
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ fileName: 'bien-ban.pdf', fileSize: 4, _file: file });
    expect(files[0].filePath).toMatch(/^reports\/\d+_bien-ban\.pdf$/);
  });

  it('nội dung < 10 ký tự → lỗi inline có số đếm, không gửi', async () => {
    const onConfirm = vi.fn();
    withQuery(<CompleteTaskModal taskId="task1" open onClose={() => {}} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Nội dung báo cáo/ }), { target: { value: 'ngắn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Nhập ít nhất 10 ký tự (4/10).')).toBeInTheDocument();
  });

  it('tệp sai định dạng → lỗi theo luật V1, không thêm', () => {
    withQuery(<CompleteTaskModal taskId="task1" open onClose={() => {}} onConfirm={() => {}} />);
    fireEvent.change(screen.getByTestId('att-input'), { target: { files: [new File(['x'], 'a.exe')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('“a.exe” không đúng định dạng');
    expect(screen.queryByText('a.exe', { selector: 'li span' })).not.toBeInTheDocument();
  });

  it('chưa có mẫu → ghi chú hướng dẫn', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })) as typeof fetch;
    withQuery(<CompleteTaskModal taskId="task1" open onClose={() => {}} onConfirm={() => {}} />);
    expect(await screen.findByText(/Chưa có mẫu nào/)).toBeInTheDocument();
  });
});

describe('SupplementReportModal', () => {
  it('onConfirm(nội dung, []) như V1; không có taskId → không render', () => {
    const onConfirm = vi.fn();
    const { unmount } = withQuery(<SupplementReportModal taskId="t" open onClose={() => {}} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Nội dung bổ sung/ }), { target: { value: 'Bổ sung ảnh chụp mới.' } });
    expect(footerButtons()).toEqual(['Đóng', 'Gửi bổ sung']);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bổ sung' }));
    expect(onConfirm).toHaveBeenCalledWith('Bổ sung ảnh chụp mới.', []);
    unmount();
    withQuery(<SupplementReportModal open onClose={() => {}} onConfirm={onConfirm} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('TransferModal', () => {
  it('ẩn mình + người đã trong việc; chọn người + ghi chú → onConfirm(id, ghi chú trim)', () => {
    const onConfirm = vi.fn();
    render(<TransferModal open onClose={() => {}} onConfirm={onConfirm} currentUserId="me" currentAssigneeIds={['me', 'a1']} task={TASK} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')!.textContent)).toEqual([expect.stringContaining('Trần Hai'), expect.stringContaining('Lê Ba')]);
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển giao' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Chọn người nhận.')).toBeInTheDocument();
    expect(screen.getByText('Nhập ghi chú chuyển giao.')).toBeInTheDocument();
    fireEvent.click(radios[0]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' đã làm 50% ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển giao' }));
    expect(onConfirm).toHaveBeenCalledWith('u2', 'đã làm 50%');
  });
});

describe('ReassignModal', () => {
  it('chọn nhiều người → onConfirm([ids]); chưa chọn → lỗi', () => {
    const onConfirm = vi.fn();
    render(<ReassignModal open onClose={() => {}} onConfirm={onConfirm} task={TASK} />);
    fireEvent.click(screen.getByRole('button', { name: 'Giao lại' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Chọn ít nhất 1 người.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Người Một' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Người Ba' }));
    expect(screen.getByText('Đã chọn 2 người')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Giao lại' }));
    expect(onConfirm).toHaveBeenCalledWith(['x1', 'x3']);
  });
});

describe('RejectReviewModal (yêu cầu làm lại)', () => {
  const people = [
    { assigneeId: 'as1', displayName: 'An', latestReport: { content: 'Báo cáo của An', attachments: [] } },
    { assigneeId: 'as2', displayName: 'Bình' },
  ];
  it('mặc định chọn tất cả (V1); thiếu lý do → lỗi đúng người; đủ → entries', () => {
    const onConfirm = vi.fn();
    render(<RejectReviewModal open onClose={() => {}} completedAssignees={people} onConfirm={onConfirm} task={TASK} />);
    expect(screen.getByRole('checkbox', { name: /An/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Bình/ })).toBeChecked();
    fireEvent.change(screen.getByRole('textbox', { name: /Lý do cho An/ }), { target: { value: ' sửa ảnh ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu làm lại' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: /Lý do cho Bình/ })).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: /Bình/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu làm lại' }));
    expect(onConfirm).toHaveBeenCalledWith([{ assigneeId: 'as1', reason: 'sửa ảnh' }]);
  });
  it('bỏ chọn hết → lỗi chọn người', () => {
    const onConfirm = vi.fn();
    render(<RejectReviewModal open onClose={() => {}} completedAssignees={people} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Tất cả/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu làm lại' }));
    expect(screen.getByText('Chọn ít nhất 1 người.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('RequestExtensionModal', () => {
  it('ngày ≤ hạn → lỗi; hợp lệ → onConfirm(lý do, ISO của ngày) như V1', () => {
    const onConfirm = vi.fn();
    render(<RequestExtensionModal open onClose={() => {}} onConfirm={onConfirm} currentDeadline="2026-10-28T00:00:00.000Z" task={TASK} />);
    const date = screen.getByLabelText(/Hạn mới/);
    expect(date).toHaveAttribute('min', '2026-10-29');
    fireEvent.change(date, { target: { value: '2026-10-28' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đơn' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Chọn ngày từ/)).toBeInTheDocument();
    expect(screen.getByText('Nhập lý do.')).toBeInTheDocument();
    fireEvent.change(date, { target: { value: '2026-11-02' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Lý do/ }), { target: { value: ' chờ linh kiện ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đơn' }));
    expect(onConfirm).toHaveBeenCalledWith('chờ linh kiện', new Date('2026-11-02').toISOString());
  });
});

describe('ApproveExtensionModal (xem xét đơn gia hạn)', () => {
  const ext = { id: 'e1', reason: 'Chờ linh kiện', requestedDate: '2026-11-05T00:00:00.000Z', requesterName: 'An' };
  it('[Đóng][Từ chối][Duyệt gia hạn]; Duyệt → onApprove(id, ghi chú) rồi đóng như V1', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClose = vi.fn();
    render(<ApproveExtensionModal open onClose={onClose} extension={ext} onApprove={onApprove} onReject={onReject} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Chờ linh kiện');
    expect(footerButtons()).toEqual(['Đóng', 'Từ chối', 'Duyệt gia hạn']);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt gia hạn' }));
    expect(onApprove).toHaveBeenCalledWith('e1', 'ok');
    expect(onClose).toHaveBeenCalled();
  });
  it('Từ chối → onReject(id, "") khi không ghi chú', () => {
    const onReject = vi.fn();
    render(<ApproveExtensionModal open onClose={() => {}} extension={ext} onApprove={() => {}} onReject={onReject} />);
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    expect(onReject).toHaveBeenCalledWith('e1', '');
  });
});
