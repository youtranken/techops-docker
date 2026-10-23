// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ConfirmProvider, useConfirm, type ConfirmOptions } from '../ConfirmDialog';

/** Nút bấm gọi confirm(), ghi kết quả ra DOM để kiểm tra */
function Harness({ opts }: { opts: ConfirmOptions }) {
  const confirm = useConfirm();
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm(opts);
          // provider bị gỡ khi dọn test → promise resolve false sau khi #out đã mất
          const el = document.getElementById('out');
          if (el) el.textContent = String(ok);
        }}
      >
        Mở
      </button>
      <output id="out" />
    </div>
  );
}

function setup(opts: ConfirmOptions = { title: 'Xóa ưu tiên "Cao"?', description: 'Không hoàn tác được.', confirmText: 'Xóa', danger: true }) {
  render(
    <ConfirmProvider>
      <Harness opts={opts} />
    </ConfirmProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Mở' }));
}

const out = () => document.getElementById('out')!.textContent;

describe('ConfirmDialog / useConfirm', () => {
  it('hiện hộp xác nhận với tiêu đề, mô tả, nút chính và nút "Đóng"', async () => {
    setup();
    const dlg = await screen.findByRole('alertdialog');
    expect(dlg).toHaveTextContent('Xóa ưu tiên "Cao"?');
    expect(dlg).toHaveTextContent('Không hoàn tác được.');
    expect(screen.getByRole('button', { name: 'Xóa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy' })).not.toBeInTheDocument();
  });

  it('bấm nút chính → resolve true và đóng hộp', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(out()).toBe('true'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('bấm "Đóng" → resolve false', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(out()).toBe('false'));
  });

  it('nhấn Esc → resolve false', async () => {
    setup();
    const dlg = await screen.findByRole('alertdialog');
    await act(async () => {
      fireEvent.keyDown(dlg, { key: 'Escape', code: 'Escape' });
    });
    await waitFor(() => expect(out()).toBe('false'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('đóng hộp → focus trả về nút đã mở hộp (bàn phím không bị lạc)', async () => {
    render(
      <ConfirmProvider>
        <Harness opts={{ title: 'Tiếp tục?' }} />
      </ConfirmProvider>,
    );
    const opener = screen.getByRole('button', { name: 'Mở' });
    opener.focus(); // trình duyệt thật focus nút khi bấm
    fireEvent.click(opener);
    fireEvent.click(await screen.findByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('danger → nút chính kiểu nguy hiểm; mặc định nút chính ghi "Xác nhận"', async () => {
    setup({ title: 'Tiếp tục?' });
    const btn = await screen.findByRole('button', { name: 'Xác nhận' });
    expect(btn.getAttribute('data-variant')).toBe('default');
  });

  it('danger: nút chính có data-variant="danger"', async () => {
    setup();
    const btn = await screen.findByRole('button', { name: 'Xóa' });
    expect(btn.getAttribute('data-variant')).toBe('danger');
  });

  it('useConfirm ngoài ConfirmProvider → báo lỗi rõ ràng', () => {
    function Bad() { useConfirm(); return null; }
    const spy = console.error;
    console.error = () => {};
    expect(() => render(<Bad />)).toThrow(/ConfirmProvider/);
    console.error = spy;
  });
});
