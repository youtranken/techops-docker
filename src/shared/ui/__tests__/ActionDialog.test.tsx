// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@/test/intl';
import { ActionDialog, DialogNote } from '../ActionDialog';
import { Field } from '../Field';

function setup(over: Partial<React.ComponentProps<typeof ActionDialog>> = {}) {
  const onClose = vi.fn();
  const onOk = vi.fn();
  render(
    <ActionDialog
      open
      onClose={onClose}
      onOk={onOk}
      title="Hủy công việc này?"
      sub="Phụ đề"
      okLabel="Hủy công việc"
      task={{ code: '26-0033', title: 'Thay ổ cứng' }}
      {...over}
    >
      <p>Mô tả</p>
      <Field id="rsn" label="Lý do" required error="Nhập lý do.">
        <textarea id="rsn" />
      </Field>
      <DialogNote tone="warn">Ghi chú</DialogNote>
    </ActionDialog>,
  );
  return { onClose, onOk };
}

describe('ActionDialog — khung hộp thoại hành động V2', () => {
  it('tiêu đề, phụ đề, thẻ tóm tắt việc, footer [Đóng][Chính]', () => {
    setup();
    const dlg = screen.getByRole('dialog', { name: 'Hủy công việc này?' });
    expect(dlg).toHaveTextContent('Phụ đề');
    expect(screen.getByTestId('dlg-task')).toHaveTextContent('26-0033');
    expect(screen.getByTestId('dlg-task')).toHaveTextContent('Thay ổ cứng');
    const btns = screen.getAllByRole('button').filter((b) => b.closest('[data-slot="dlg-footer"]'));
    expect(btns.map((b) => b.textContent)).toEqual(['Đóng', 'Hủy công việc']);
  });

  it('focus vào ô nhập đầu tiên khi mở', async () => {
    setup();
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('rsn')));
  });

  it('không có ô nhập → focus nút chính', async () => {
    render(<ActionDialog open onClose={() => {}} onOk={() => {}} title="Duyệt?" okLabel="Duyệt"><p>x</p></ActionDialog>);
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Duyệt'));
  });

  it('bấm nút chính → onOk; bấm Đóng → onClose', () => {
    const { onClose, onOk } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy công việc' }));
    expect(onOk).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc → onClose', () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('danger → nút chính biến thể danger', () => {
    setup({ danger: true });
    expect(screen.getByRole('button', { name: 'Hủy công việc' })).toHaveAttribute('data-variant', 'danger');
  });

  it('đang gửi: nút chính + Đóng bị khoá, Esc không đóng, có chữ đang xử lý', () => {
    const { onClose, onOk } = setup({ pending: true });
    const ok = screen.getByRole('button', { name: /Đang xử lý/ });
    expect(ok).toBeDisabled();
    expect(ok).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(ok);
    expect(onClose).not.toHaveBeenCalled();
    expect(onOk).not.toHaveBeenCalled();
  });

  it('Field: nhãn bắt buộc, lỗi inline gắn aria-invalid + aria-describedby', () => {
    setup();
    const ta = screen.getByLabelText(/Lý do/);
    expect(ta).toHaveAttribute('aria-invalid', 'true');
    expect(ta.getAttribute('aria-describedby')).toContain('rsn-err');
    expect(document.getElementById('rsn-err')).toHaveTextContent('Nhập lý do.');
  });

  it('DialogNote hiện nội dung', () => {
    setup();
    expect(screen.getByText('Ghi chú').closest('[data-tone]')).toHaveAttribute('data-tone', 'warn');
  });

  it('extraActions nằm giữa Đóng và nút chính', () => {
    setup({ extraActions: <button type="button">Từ chối</button> });
    const btns = screen.getAllByRole('button').filter((b) => b.closest('[data-slot="dlg-footer"]'));
    expect(btns.map((b) => b.textContent)).toEqual(['Đóng', 'Từ chối', 'Hủy công việc']);
  });
});
