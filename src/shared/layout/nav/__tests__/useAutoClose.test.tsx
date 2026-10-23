// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import { useAutoClose } from '../useAutoClose';

describe('useAutoClose — ngăn kéo mobile tự đóng', () => {
  it('đổi route (pathname/query) khi đang mở → gọi đóng', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open, route }) => useAutoClose(open, onClose, route), {
      initialProps: { open: true, route: '/tasks' },
    });
    expect(onClose).not.toHaveBeenCalled(); // mở lần đầu không tự đóng
    rerender({ open: true, route: '/tasks?view=important' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('render lại cùng route → không đóng', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open, route }) => useAutoClose(open, onClose, route), {
      initialProps: { open: true, route: '/tasks' },
    });
    rerender({ open: true, route: '/tasks' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('đang đóng thì đổi route không gọi đóng', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open, route }) => useAutoClose(open, onClose, route), {
      initialProps: { open: false, route: '/' },
    });
    rerender({ open: false, route: '/hr/users' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc khi đang mở → đóng; khi đóng thì Esc không làm gì', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(({ open }) => useAutoClose(open, onClose, '/'), { initialProps: { open: true } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender({ open: false });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
