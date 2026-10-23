// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/intl';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('tổng 0 → không hiện', () => {
    const { container } = render(<Pagination page={1} pageSize={20} total={0} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('vi: nhãn tiếng Việt, số theo locale (1.248)', () => {
    render(<Pagination page={2} pageSize={20} total={1248} onPageChange={() => {}} onPageSizeChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Phân trang' })).toBeInTheDocument();
    expect(screen.getByText('21–40 / 1.248')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Mỗi trang')).toBeInTheDocument();
  });

  it('en: nhãn tiếng Anh, số theo locale (1,248)', () => {
    render(<Pagination page={1} pageSize={20} total={1248} onPageChange={() => {}} onPageSizeChange={() => {}} />, { locale: 'en' });
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByText('1–20 / 1,248')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
    expect(screen.getByText('Per page')).toBeInTheDocument();
  });

  it('bấm trang sau → onPageChange(page + 1)', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={20} total={100} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
