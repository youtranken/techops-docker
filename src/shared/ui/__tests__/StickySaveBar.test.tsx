// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/intl';
import { StickySaveBar } from '../StickySaveBar';

describe('StickySaveBar', () => {
  it('không dirty → không hiện gì', () => {
    render(<StickySaveBar dirty={false} onSave={() => {}} onReset={() => {}} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
  });

  it('dirty → hiện thanh với lời nhắc + [Hoàn tác] [Lưu thay đổi]', () => {
    render(<StickySaveBar dirty onSave={() => {}} onReset={() => {}} />);
    const bar = screen.getByRole('region', { name: 'Bạn có thay đổi chưa lưu' });
    expect(bar).toBeInTheDocument();
    const btns = screen.getAllByRole('button').map((b) => b.textContent);
    expect(btns).toEqual(['Hoàn tác', 'Lưu thay đổi']);
  });

  it('bấm Lưu thay đổi → gọi onSave; Hoàn tác → gọi onReset', () => {
    const onSave = vi.fn();
    const onReset = vi.fn();
    render(<StickySaveBar dirty onSave={onSave} onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('đang lưu → nút Lưu ghi "Đang lưu…" và bị khoá, Hoàn tác cũng khoá', () => {
    const onSave = vi.fn();
    render(<StickySaveBar dirty saving onSave={onSave} onReset={() => {}} />);
    const save = screen.getByRole('button', { name: 'Đang lưu…' });
    expect(save).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hoàn tác' })).toBeDisabled();
  });

  it('đổi dirty true → false thì thanh ẩn đi', () => {
    const { rerender } = render(<StickySaveBar dirty onSave={() => {}} onReset={() => {}} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
    rerender(<StickySaveBar dirty={false} onSave={() => {}} onReset={() => {}} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('EN: lời nhắc + nút theo ngôn ngữ', () => {
    render(<StickySaveBar dirty onSave={() => {}} onReset={() => {}} />, { locale: 'en' });
    expect(screen.getByRole('region', { name: 'You have unsaved changes' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Undo', 'Save changes']);
  });
});
