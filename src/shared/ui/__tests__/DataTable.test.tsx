// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { render } from '@/test/intl';
import { DataTable, type DataTableColumn } from '../DataTable';

type Row = { id: string; code: string; title: string; who: string };
const rows: Row[] = [
  { id: 'a', code: '26-0001', title: 'Cài máy in', who: 'Lê Minh' },
  { id: 'b', code: '26-0002', title: 'Thay ổ cứng', who: 'Cao Thuận' },
];
const columns: DataTableColumn<Row>[] = [
  { key: 'code', header: 'Mã', width: '96px', cell: (r) => r.code },
  { key: 'title', header: 'Công việc', cell: (r) => r.title, mobile: 'main' },
  { key: 'who', header: 'Người làm', width: '160px', hideBelow: 'lg', cell: (r) => r.who, mobile: 'end' },
];

describe('DataTable', () => {
  it('có dữ liệu → tiêu đề cột + mỗi dòng một row', () => {
    render(<DataTable ariaLabel="Công việc" columns={columns} rows={rows} getRowId={(r) => r.id} />);
    const table = screen.getByRole('table', { name: 'Công việc' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Mã', 'Công việc', 'Người làm']);
    expect(within(table).getAllByRole('row')).toHaveLength(3); // 1 hàng tiêu đề + 2 dòng
    expect(screen.getByText('Thay ổ cứng')).toBeInTheDocument();
  });

  it('đặt lưới cột qua biến CSS, cột ẩn theo breakpoint bị bỏ khỏi lưới hẹp', () => {
    render(<DataTable ariaLabel="T" columns={columns} rows={rows} getRowId={(r) => r.id} />);
    const table = screen.getByRole('table');
    expect(table.style.getPropertyValue('--cols-xl')).toBe('96px minmax(0,1fr) 160px');
    expect(table.style.getPropertyValue('--cols-lg')).toBe('96px minmax(0,1fr)');
    const whoCell = screen.getByText('Lê Minh').closest('[role="cell"]')!;
    expect(whoCell).toHaveAttribute('data-hide', 'lg');
    expect(whoCell).toHaveAttribute('data-m', 'end');
  });

  it('loading → skeleton, không hiện dữ liệu, có aria-busy', () => {
    render(<DataTable ariaLabel="T" columns={columns} rows={rows} getRowId={(r) => r.id} loading skeletonRows={4} />);
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Cài máy in')).not.toBeInTheDocument();
    expect(table.querySelectorAll('[data-skeleton-row]')).toHaveLength(4);
  });

  it('rỗng → EmptyState với chữ truyền vào', () => {
    render(
      <DataTable ariaLabel="T" columns={columns} rows={[]} getRowId={(r) => r.id}
        empty={{ title: 'Chưa có công việc', description: 'Tạo việc mới để bắt đầu.' }} />,
    );
    expect(screen.getByText('Chưa có công việc')).toBeInTheDocument();
    expect(screen.getByText('Tạo việc mới để bắt đầu.')).toBeInTheDocument();
  });

  it('rỗng không truyền gì → chữ mặc định', () => {
    render(<DataTable ariaLabel="T" columns={columns} rows={[]} getRowId={(r) => r.id} />);
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument();
  });

  it('lỗi → ErrorState + nút Thử lại gọi onRetry', () => {
    const onRetry = vi.fn();
    render(<DataTable ariaLabel="T" columns={columns} rows={rows} getRowId={(r) => r.id} error="Mất kết nối máy chủ" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối máy chủ');
    expect(screen.queryByText('Cài máy in')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('onRowClick: bấm dòng hoặc Enter trên dòng → gọi với đúng dữ liệu', () => {
    const onRowClick = vi.fn();
    render(<DataTable ariaLabel="T" columns={columns} rows={rows} getRowId={(r) => r.id} onRowClick={onRowClick} />);
    const row = screen.getByText('Thay ổ cứng').closest('[role="row"]')!;
    fireEvent.click(row);
    expect(onRowClick).toHaveBeenLastCalledWith(rows[1]);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('Enter nổi bọt từ nút bên trong dòng không mở dòng', () => {
    const onRowClick = vi.fn();
    const cols: DataTableColumn<Row>[] = [...columns, { key: 'x', header: '', cell: () => <button type="button">nút</button> }];
    render(<DataTable ariaLabel="T" columns={cols} rows={rows} getRowId={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.keyDown(screen.getAllByRole('button', { name: 'nút' })[0], { key: 'Enter' });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('EN: chữ mặc định rỗng / lỗi / Thử lại theo ngôn ngữ', () => {
    const { unmount } = render(<DataTable ariaLabel="T" columns={columns} rows={[]} getRowId={(r) => r.id} />, { locale: 'en' });
    expect(screen.getByText('No data')).toBeInTheDocument();
    unmount();
    render(<DataTable ariaLabel="T" columns={columns} rows={rows} getRowId={(r) => r.id} error="x" onRetry={() => {}} />, { locale: 'en' });
    expect(screen.getByText('Couldn’t load data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
