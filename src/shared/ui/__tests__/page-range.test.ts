import { describe, it, expect } from 'vitest';
import { pageRange, pageCount, pageWindow, PAGE_SIZES } from '../page-range';

describe('pageRange — dải số trang có "…"', () => {
  it('≤7 trang: hiện hết', () => {
    expect(pageRange(1, 1)).toEqual([1]);
    expect(pageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('0 trang → rỗng', () => {
    expect(pageRange(1, 0)).toEqual([]);
  });
  it('đầu dải', () => {
    expect(pageRange(1, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
    expect(pageRange(4, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
  });
  it('cuối dải', () => {
    expect(pageRange(17, 20)).toEqual([1, '…', 16, 17, 18, 19, 20]);
    expect(pageRange(20, 20)).toEqual([1, '…', 16, 17, 18, 19, 20]);
  });
  it('giữa dải: hai dấu …', () => {
    expect(pageRange(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
    expect(pageRange(5, 9)).toEqual([1, '…', 4, 5, 6, '…', 9]);
  });
  it('trang hiện tại ngoài khoảng bị kẹp lại', () => {
    expect(pageRange(99, 20)).toEqual([1, '…', 16, 17, 18, 19, 20]);
    expect(pageRange(-3, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
  });
});

describe('pageCount / pageWindow', () => {
  it('số trang làm tròn lên', () => {
    expect(pageCount(0, 20)).toBe(0);
    expect(pageCount(1, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
  });
  it('khoảng "a–b / n" của trang', () => {
    expect(pageWindow(1, 20, 41)).toEqual({ from: 1, to: 20, total: 41 });
    expect(pageWindow(3, 20, 41)).toEqual({ from: 41, to: 41, total: 41 });
    expect(pageWindow(1, 20, 0)).toEqual({ from: 0, to: 0, total: 0 });
  });
  it('cỡ trang 10/20/50/100', () => {
    expect(PAGE_SIZES).toEqual([10, 20, 50, 100]);
  });
});
