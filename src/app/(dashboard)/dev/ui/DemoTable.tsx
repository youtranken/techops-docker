'use client';

/** Bảng mẫu cho /dev/ui: cột như danh sách việc (_SPEC §5), menu ⋯, phân trang, chuyển loading/rỗng/lỗi. */
import { useMemo, useState } from 'react';
import { Eye, ExternalLink, Copy, Check, Ban, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { TaskStatus } from '@prisma/client';
import { Segmented } from '@/components/ui/segmented';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { Pagination } from '@/shared/ui/Pagination';
import { QuickMenu } from '@/shared/ui/QuickMenu';
import { StatusDot } from '@/shared/ui/StatusDot';
import { PriorityFlag } from '@/shared/ui/PriorityFlag';
import { DueText } from '@/shared/ui/DueText';

interface Row { id: string; title: string; level: number; pr: string; who: string; status: TaskStatus; due: Date | null; star: boolean }

const STATUSES: TaskStatus[] = ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'];
const PR: [number, string][] = [[4, 'Khẩn cấp'], [3, 'Cao'], [2, 'Bình thường'], [1, 'Thấp']];
const TITLES = ['Cài lại máy in tầng 3', 'Thay ổ cứng máy kế toán', 'Cấp quyền VPN cho nhân viên mới', 'Kiểm tra camera kho', 'Gia hạn tên miền pmh.com.vn', 'Sao lưu dữ liệu tháng 10'];
const WHO = ['Lê Minh', 'Cao Thuận', 'Phan Quản trị', 'Nguyễn An'];

const ALL: Row[] = Array.from({ length: 137 }, (_, i) => ({
  id: `26-${String(i + 1).padStart(4, '0')}`,
  title: TITLES[i % TITLES.length],
  level: PR[i % 4][0],
  pr: PR[i % 4][1],
  who: WHO[i % WHO.length],
  status: STATUSES[i % STATUSES.length],
  due: i % 7 === 6 ? null : new Date(Date.now() + ((i % 13) - 4) * 86_400_000),
  star: i % 5 === 0,
}));

type Mode = 'data' | 'loading' | 'empty' | 'error';

export function DemoTable() {
  const [mode, setMode] = useState<Mode>('data');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const rows = useMemo(() => ALL.slice((page - 1) * size, page * size), [page, size]);

  const columns: DataTableColumn<Row>[] = [
    { key: 'id', header: 'Mã', width: '84px', cell: (r) => <span className="font-mono text-xs text-ink-3">{r.id}</span>, mobileOrder: 1 },
    {
      key: 'title', header: 'Công việc', mobile: 'main', mobileOrder: 4,
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          {r.star && <Star aria-label="Quan trọng" className="size-3.5 flex-none fill-amber text-amber" />}
          <span className="truncate font-medium text-ink max-[680px]:line-clamp-2 max-[680px]:whitespace-normal">{r.title}</span>
        </span>
      ),
    },
    { key: 'pr', header: 'Ưu tiên', width: '120px', cell: (r) => <PriorityFlag level={r.level} name={r.pr} />, mobileOrder: 2 },
    { key: 'who', header: 'Người làm', width: '140px', hideBelow: 'lg', mobile: 'end', mobileOrder: 7, cell: (r) => <span className="truncate text-[13px] text-ink-2">{r.who}</span> },
    { key: 'st', header: 'Trạng thái', width: '150px', cell: (r) => <StatusDot status={r.status} />, mobileOrder: 5 },
    { key: 'due', header: 'Hạn', width: '112px', cell: (r) => <DueText dueDate={r.due} status={r.status} />, mobileOrder: 6 },
    {
      key: 'more', header: <span className="sr-only">Thao tác</span>, width: '32px', mobile: 'end', mobileOrder: 3,
      cell: (r) => (
        <QuickMenu
          label={`Thao tác cho ${r.id}`}
          groups={[
            [
              { key: 'view', label: 'Xem nhanh', icon: Eye, onSelect: () => toast(`Xem ${r.id}`) },
              { key: 'open', label: 'Mở trang đầy đủ', icon: ExternalLink, onSelect: () => toast(`Mở ${r.id}`) },
              { key: 'copy', label: 'Sao chép mã', icon: Copy, onSelect: () => toast(`Đã chép ${r.id}`) },
            ],
            r.status === 'PENDING_REVIEW' ? [{ key: 'review', label: 'Nghiệm thu', icon: Check, onSelect: () => toast('Nghiệm thu') }] : [],
            r.status === 'IN_PROGRESS' ? [{ key: 'cancel', label: 'Hủy công việc', icon: Ban, danger: true, onSelect: () => toast('Hủy') }] : [],
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Segmented<Mode>
        ariaLabel="Trạng thái bảng"
        value={mode}
        onChange={setMode}
        size="sm"
        options={[{ value: 'data', label: 'Có dữ liệu' }, { value: 'loading', label: 'Đang tải' }, { value: 'empty', label: 'Rỗng' }, { value: 'error', label: 'Lỗi' }]}
      />
      <div>
        <DataTable
          ariaLabel="Công việc mẫu"
          columns={columns}
          rows={mode === 'empty' ? [] : rows}
          getRowId={(r) => r.id}
          loading={mode === 'loading'}
          skeletonRows={5}
          error={mode === 'error' ? 'Mất kết nối máy chủ. Kiểm tra mạng rồi thử lại.' : undefined}
          onRetry={() => setMode('data')}
          empty={{ title: 'Không có công việc nào khớp bộ lọc', description: 'Thử bỏ bớt bộ lọc.' }}
          onRowClick={(r) => toast(`Mở ${r.id}`)}
        />
        {mode === 'data' && (
          <Pagination page={page} pageSize={size} total={ALL.length} onPageChange={setPage} onPageSizeChange={(n) => { setSize(n); setPage(1); }} />
        )}
      </div>
    </div>
  );
}
