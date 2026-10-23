import { describe, it, expect } from 'vitest';
import { groupByDay } from '../group-by-day';
import { APP_TIMEZONE } from '@/i18n/format';

const n = (id: string, iso: string) => ({ id, createdAt: iso });

describe('groupByDay — nhóm thông báo Hôm nay / Trước đó theo múi giờ app (UTC+7)', () => {
  // 23/10/2026 08:00 giờ VN = 23/10 01:00 UTC
  const now = new Date('2026-10-23T01:00:00Z');

  it('chia đúng mốc nửa đêm giờ VN, không theo giờ UTC', () => {
    const items = [
      n('a', '2026-10-23T00:30:00Z'), // 07:30 23/10 VN → hôm nay
      n('b', '2026-10-22T17:00:00Z'), // 00:00 23/10 VN → hôm nay (đúng mốc)
      n('c', '2026-10-22T16:59:59Z'), // 23:59:59 22/10 VN → trước đó (dù cùng ngày 22 theo UTC… và khác ngày "now" UTC)
      n('d', '2026-10-01T05:00:00Z'), // lâu rồi
    ];
    const g = groupByDay(items, now, APP_TIMEZONE);
    expect(g.today.map((x) => x.id)).toEqual(['a', 'b']);
    expect(g.earlier.map((x) => x.id)).toEqual(['c', 'd']);
  });

  it('khi UTC vẫn là hôm qua nhưng VN đã sang ngày mới', () => {
    // now = 23/10 00:10 VN = 22/10 17:10 UTC
    const now2 = new Date('2026-10-22T17:10:00Z');
    const g = groupByDay([n('x', '2026-10-22T17:05:00Z'), n('y', '2026-10-22T10:00:00Z')], now2, APP_TIMEZONE);
    expect(g.today.map((x) => x.id)).toEqual(['x']);
    expect(g.earlier.map((x) => x.id)).toEqual(['y']);
  });

  it('mặc định dùng múi giờ app; giữ thứ tự đầu vào; nhận cả Date', () => {
    const g = groupByDay([n('p', '2026-10-23T00:59:00Z'), { id: 'q', createdAt: new Date('2026-10-20T00:00:00Z') }], now);
    expect(g.today.map((x) => x.id)).toEqual(['p']);
    expect(g.earlier.map((x) => x.id)).toEqual(['q']);
  });

  it('danh sách rỗng', () => {
    expect(groupByDay([], now)).toEqual({ today: [], earlier: [] });
  });
});
