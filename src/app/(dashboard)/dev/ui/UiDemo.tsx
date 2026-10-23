'use client';

/** Demo nội bộ bộ component dùng chung V2 (A1-2). Chỉ để dev xem/so với preview ds-v2, không phải màn nghiệp vụ. */
import { useState } from 'react';
import { Info, LayoutList, KanbanSquare, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusDot } from '@/shared/ui/StatusDot';
import { PriorityFlag } from '@/shared/ui/PriorityFlag';
import { DueText } from '@/shared/ui/DueText';
import { Block, Card } from '@/shared/ui/Block';
import { KvGrid } from '@/shared/ui/KvGrid';
import { SummaryBar } from '@/shared/ui/SummaryBar';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/States';
import { FilterChip } from '@/shared/ui/FilterChip';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { TASK_STATUS_META, ASSIGNEE_STATUS_META } from '@/shared/ui/status-meta';
import { DemoTable } from './DemoTable';

const day = (n: number) => new Date(Date.now() + n * 86_400_000);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-head text-[13px] font-semibold uppercase tracking-wide text-ink-3">{title}</h2>
      {children}
    </section>
  );
}

export function UiDemo() {
  const confirm = useConfirm();
  const [view, setView] = useState<'list' | 'board'>('list');
  const [chips, setChips] = useState([{ k: 'st', l: 'Trạng thái', v: 'Đang làm' }, { k: 'pr', l: 'Ưu tiên', v: 'Khẩn' }]);
  const [name, setName] = useState('Phòng IT');
  const [saved, setSaved] = useState('Phòng IT');

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 pb-24">
      <header>
        <h1 className="font-head text-[22px] font-semibold">Bộ component V2</h1>
        <p className="text-sm text-ink-3">Trang dev (/dev/ui) — production trả 404.</p>
      </header>

      <Section title="Nút">
        <div className="flex flex-wrap gap-2">
          <Button size="md">Chính</Button>
          <Button size="md" variant="outline">Thường</Button>
          <Button size="md" variant="subtle">Ghost</Button>
          <Button size="md" variant="soft">Soft</Button>
          <Button size="md" variant="neg">Từ chối</Button>
          <Button size="md" variant="danger">Xóa</Button>
          <Button size="xs" variant="outline">Nhỏ</Button>
          <Badge variant="chip">26-0033</Badge>
          <Badge variant="soft">Mới</Badge>
          <Badge variant="phase">Phase B</Badge>
        </div>
      </Section>

      <Section title="Trạng thái · Ưu tiên · Hạn">
        <Card>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {Object.keys(TASK_STATUS_META).map((s) => <StatusDot key={s} status={s} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            {Object.keys(ASSIGNEE_STATUS_META).map((s) => <StatusDot key={s} kind="assignee" status={s} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            <PriorityFlag level={4} name="Khẩn cấp" />
            <PriorityFlag level={3} name="Cao" />
            <PriorityFlag level={2} name="Bình thường" />
            <PriorityFlag level={1} name="Thấp" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            <DueText dueDate={day(-3)} status="IN_PROGRESS" />
            <DueText dueDate={day(0)} status="IN_PROGRESS" />
            <DueText dueDate={day(1)} status="IN_PROGRESS" />
            <DueText dueDate={day(5)} status="IN_PROGRESS" />
            <DueText dueDate={day(20)} status="IN_PROGRESS" />
            <DueText dueDate={day(-3)} status="COMPLETED" />
            <DueText dueDate={day(-3)} status="CANCELLED" />
            <DueText dueDate={null} status="IN_PROGRESS" />
          </div>
        </Card>
      </Section>

      <Section title="Tabs · Segmented · Chip lọc">
        <Tabs defaultValue="mine">
          <TabsList aria-label="Nhóm việc">
            <TabsTrigger value="mine" count={4}>Cần tôi xử lý</TabsTrigger>
            <TabsTrigger value="open" count={27}>Đang mở</TabsTrigger>
            <TabsTrigger value="done">Đã xong</TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="flex flex-wrap items-center gap-3">
            <Segmented
              ariaLabel="Kiểu xem"
              value={view}
              onChange={setView}
              options={[{ value: 'list', label: 'Danh sách', icon: LayoutList }, { value: 'board', label: 'Bảng', icon: KanbanSquare }]}
            />
            {chips.map((c) => (
              <FilterChip key={c.k} label={c.l} value={c.v} onRemove={() => setChips((x) => x.filter((y) => y.k !== c.k))} />
            ))}
          </TabsContent>
          <TabsContent value="open" className="text-sm text-ink-2">Nội dung tab Đang mở.</TabsContent>
          <TabsContent value="done" className="text-sm text-ink-2">Nội dung tab Đã xong.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Thanh tóm tắt">
        <SummaryBar
          items={[
            { label: 'Trạng thái', value: <StatusDot status="IN_PROGRESS" strong /> },
            { label: 'Ưu tiên', value: <PriorityFlag level={4} name="Khẩn cấp" /> },
            { label: 'Hạn', value: <DueText dueDate={day(2)} status="IN_PROGRESS" />, hint: 'Đã gia hạn 1/5' },
            { label: 'Người làm', value: 'Lê Minh' },
            { label: 'Người tạo', value: 'Cao Thuận' },
            { label: 'Loại', value: 'Phần cứng' },
          ]}
        />
      </Section>

      <Section title="Khối có khung + lưới nhãn/giá trị">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Block title="Thông tin" icon={Info} flush>
            <KvGrid
              items={[
                { label: 'Mã', value: <span className="font-mono text-[13px]">26-0033</span> },
                { label: 'Trạng thái', value: <StatusDot status="PENDING_REVIEW" strong /> },
                { label: 'Hạn', value: <DueText dueDate={day(-1)} status="PENDING_REVIEW" /> },
                { label: 'Ưu tiên', value: <PriorityFlag level={3} name="Cao" /> },
                { label: 'Chế độ', value: 'Phê duyệt', hint: 'Boss duyệt trước khi giao' },
              ]}
            />
          </Block>
          <Block title="Tệp đính kèm" icon={Paperclip} count={0} actions={<Button size="xs" variant="subtle">Thêm tệp</Button>}>
            <EmptyState title="Chưa có tệp" description="PDF, ảnh, Word, Excel — tối đa 10 MB." className="py-6" />
          </Block>
        </div>
      </Section>

      <Section title="Bảng dữ liệu + phân trang (thu hẹp cửa sổ ≤680 để thấy dòng 2 tầng)">
        <DemoTable />
      </Section>

      <Section title="Trạng thái lỗi · đang tải">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Card><ErrorState description="Mất kết nối máy chủ." onRetry={() => toast.info('Thử lại')} /></Card>
          <Card>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Skeleton variant="circle" className="size-8" /><Skeleton variant="line" className="w-1/2" /></div>
              <Skeleton variant="line" className="w-full" />
              <Skeleton variant="line" className="w-4/5" />
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Hộp xác nhận · thanh lưu">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="md"
            variant="danger"
            onClick={async () => {
              const ok = await confirm({ title: 'Xóa ưu tiên "Khẩn cấp"?', description: 'Thao tác này không hoàn tác được.', confirmText: 'Xóa', danger: true });
              toast(ok ? 'Đã đồng ý' : 'Đã đóng');
            }}
          >
            Mở hộp xác nhận
          </Button>
          <label className="flex items-center gap-2 text-sm">
            Tên phòng
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-md border border-line-2 bg-surface px-3 text-sm" />
          </label>
        </div>
        <StickySaveBar dirty={name !== saved} onSave={() => { setSaved(name); toast.success('Đã lưu'); }} onReset={() => setName(saved)} />
      </Section>
    </div>
  );
}
