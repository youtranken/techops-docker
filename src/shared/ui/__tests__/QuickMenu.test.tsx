// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@/test/intl';
import { QuickMenu, type QuickMenuGroup } from '../QuickMenu';

const groups = (onPick = vi.fn()): QuickMenuGroup[] => [
  [{ key: 'view', label: 'Xem nhanh', onSelect: () => onPick('view') }, { key: 'copy', label: 'Sao chép mã', onSelect: () => onPick('copy') }],
  [],
  [{ key: 'cancel', label: 'Hủy công việc', danger: true, onSelect: () => onPick('cancel') }],
];

/** Mở menu bằng bàn phím (Radix mở bằng Enter/Space/ArrowDown trên nút) */
async function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Thao tác nhanh' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  return screen.findByRole('menu');
}

describe('QuickMenu (⋯)', () => {
  it('mọi nhóm rỗng → không hiện nút ⋯', () => {
    const { container } = render(<QuickMenu groups={[[], []]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('nhóm rỗng bị bỏ, chỉ còn 1 vạch ngăn giữa 2 nhóm có mục', async () => {
    render(<QuickMenu groups={groups()} />);
    const menu = await openMenu();
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Xem nhanh', 'Sao chép mã', 'Hủy công việc']);
    expect(menu.querySelectorAll('[role="separator"]')).toHaveLength(1);
  });

  it('mục nguy hiểm được đánh dấu', async () => {
    render(<QuickMenu groups={groups()} />);
    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'Hủy công việc' })).toHaveAttribute('data-danger', 'true');
  });

  it('bấm nút ⋯ không lan lên dòng chứa nó', () => {
    const onRow = vi.fn();
    render(
      <div onClick={onRow} onKeyDown={onRow}>
        <QuickMenu groups={groups()} />
      </div>,
    );
    const trigger = screen.getByRole('button', { name: 'Thao tác nhanh' });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(onRow).not.toHaveBeenCalled();
  });

  it('chọn một mục → gọi onSelect, không lan lên dòng (portal vẫn nổi bọt trong React)', async () => {
    const onRow = vi.fn();
    const onPick = vi.fn();
    render(
      <div onClick={onRow} onKeyDown={onRow}>
        <QuickMenu groups={groups(onPick)} />
      </div>,
    );
    await openMenu();
    onRow.mockClear();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép mã' }));
    expect(onPick).toHaveBeenCalledWith('copy');
    expect(onRow).not.toHaveBeenCalled();
  });

  it('đi bằng bàn phím: mở bằng Enter, focus mục đầu, ↓ sang mục kế', async () => {
    render(<QuickMenu groups={groups()} />);
    await openMenu();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Xem nhanh' })).toHaveFocus());
    // phím đi tới phần tử đang focus (như trình duyệt thật)
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Sao chép mã' })).toHaveFocus());
  });

  it('nhãn nút có thể đổi', () => {
    render(<QuickMenu groups={groups()} label="Thao tác cho 26-0033" />);
    expect(screen.getByRole('button', { name: 'Thao tác cho 26-0033' })).toBeInTheDocument();
  });

  it('EN: nhãn mặc định của nút ⋯ theo ngôn ngữ', () => {
    render(<QuickMenu groups={groups()} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Quick actions' })).toBeInTheDocument();
  });
});
