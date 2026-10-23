# TechOps DS v2 — Quy ước preview

Bộ khung dùng chung cho mọi trang preview trong `ds-v2/`. Chuẩn được chốt từ `tasks-list.html` + `tasks-board.html`.

## 1. Cách nạp (đúng thứ tự)

```html
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@500;600&family=Noto+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap&subset=vietnamese" rel="stylesheet">
<link rel="stylesheet" href="app.css">
<!-- CSS riêng của trang (nếu có) đặt trong <style> SAU app.css -->
<body data-no-pvbar>
<main class="content" id="content">…nội dung trang…</main>
<script src="copy.js"></script>   <!-- I18N: từ điển vi/en, TASKS, PEOPLE -->
<script src="ds.js"></script>     <!-- icon sprite: <i data-i="tên">, ic(tên,cls), theme -->
<script src="data.js"></script>   <!-- DATA: dữ liệu chi tiết mẫu (song ngữ) -->
<script src="app.js"></script>    <!-- App.* -->
<script>App.shell({active:'tasks', crumbs:[{t:'nav.tasks',href:'tasks-list.html'},{text:'26-0033',mono:1}]});</script>
```

## 2. App.* (app.js)

| API | Việc |
|---|---|
| `App.shell({active, crumbs, title, pv, noRole, onNav, onOpenTask})` | Dựng sidebar + topbar (breadcrumb, tìm kiếm, thông báo, menu người dùng) + ngăn trượt + toast + thanh preview quanh `#content`. `pv`: HTML/hàm thêm điều khiển vào thanh preview. |
| `App.role3` / `App.setRole(r)` / `App.me()` | **3 vai trò như V1**: `admin` (ADMIN, "Quản trị viên"/"Admin", Phan Quản trị **PQ**) · `boss` (BOSS, "Vice Manager", Cao Thuận **CT**) · `emp` (EMPLOYEE, "Nhân viên"/"Staff", Lê Minh **LM**). Lưu `localStorage.app-role`, phát `rolechange`. |
| `App.isBoss()` · `App.isAdmin()` · `App.isBossOnly()` · `App.isEmp()` · `App.roleCode()` · `App.roleLabel()` | `isBoss()` = ADMIN **hoặc** BOSS (giống `['ADMIN','BOSS']` trong code — ★, Mới xong, duyệt, nghiệm thu…). `isAdmin()` chỉ ADMIN (Khôi phục, Giao lại, xoá bình luận người khác, Bảo mật/SMTP/Chung, tạo user, reset Helpdesk). `roleCode()` → `'ADMIN'|'BOSS'|'EMPLOYEE'`. |
| `App.role` (cũ) | `'boss'|'emp'` — admin trả `'boss'` để trang cũ (vd `MOCK[App.role]`) không vỡ. Trang mới dùng `App.role3`. |
| `App.grants()` / `App.setGrants(on)` / `App.canSeeMenu(k)` | Menu cấp riêng cho nhân viên (V1 `Sidebar.tsx:66-86`, quyền menu theo từng người). k ∈ `logs analytics helpdesk hr settings`. ADMIN/BOSS luôn thấy; nhân viên mặc định chỉ Tổng quan + Công việc; công tắc thanh preview "Nhân viên được cấp thêm menu" bật cả 5. |
| `App.idleWarn()` / `App.idleClose(keep)` | Cảnh báo sắp hết phiên (V1 `IdleTimeoutProvider`: 30 phút, cảnh báo 1 phút trước, kiểm mỗi 30 giây). Thẻ đếm ngược + [Đăng xuất][Tiếp tục làm việc]; hết giờ → `login.html?s=expired`. Thanh preview có nút "Thử cảnh báo hết phiên". |
| `App.phaseB()` | HTML nhãn nhỏ `.phase-b` cho phần V1 chưa có backend (mục 7). |
| `App.navCounts({starred,unseen})`, `App.navActive(k)`, `App.crumbs([...])`, `App.refreshPv()` | Cập nhật một phần shell. |
| `App.viewToggle('list'|'board')` | Nút chuyển Danh sách / Bảng. |
| `App.toast(msg, 'success'|'info'|'error')` | Toast xếp chồng ở đáy, tự tắt 6s, có nút Đóng. |
| `App.dialog({title, sub, body, size:'sm'|'md'|'lg', ok, danger, close, form, init, onOk, onClose})` | Hộp thoại; `onOk` trả `false` để giữ mở (lỗi kiểm tra). Footer `[Đóng][Chính]` căn phải; mobile trượt từ dưới. |
| `App.confirm({title, text, ok, danger, onOk})` | Hộp xác nhận nhỏ. |
| `App.drawer.open({html,label,onClose})` / `.set(html)` / `.close()` / `.isOpen()` | Ngăn trượt phải (bẫy focus, Esc, nền mờ). |
| `App.menu(btn, html, onPick, {fixed, label})` / `App.mi(k,icon,label,{danger})` | Menu thả xuống (phím mũi tên, Esc). `fixed:1` gắn vào body và định vị theo nút — dùng khi nút nằm trong khung `overflow` (dòng bảng, thẻ ở cột); cuộn thì bám theo nút. |
| `App.quickMenu(btn, task, {onView(id), onChange(k,res)})` / `App.quickGroups(task)` / `App.copyId(id)` | Menu thao tác nhanh ⋯ trên dòng/thẻ (xem mục 5). |
| `App.task.*` | Luật nghiệp vụ **port 1:1 từ V1** (mục 8): `perm(t)` (= `useTaskPermissions`), `actions(t)→{main,more,perm}`, `needsMe`, `visible` (RLS `task-query.service`), `canEdit`, `canComment`, `canEditComment(c)`, `canDelComment(c)`, `allFailed`, `norm` (mã người làm cũ → enum V1), `people`, `active`, `mine`, `holder`, `extCount`… `App.allowedActions(p)` = `getAllowedActions` của `taskActionMatrix.ts`. |
| `App.act(task, k, {done, cancel, who, ext})` | Mở hộp thoại hành động và cập nhật task: `approve reject accept decline report supplement review rework cancel restore extend extOk extNo extWd transfer reassign`. |
| `App.afBanner(t)` · `App.attCheck(list, have)` | Banner "mọi người đã từ chối" (allFailed) · kiểm tệp theo `attachment-rules.ts` (trả chuỗi lỗi hoặc ''). |
| `App.taskDetail(task, {mode:'drawer'|'page', nav, rerender, onStep})` | Bộ dựng chi tiết công việc DÙNG CHUNG: drawer = bản rút gọn + "Mở trang đầy đủ"; page = trang `task.html`. Hành vi chạy bằng `[data-ta]`. |
| `App.mountTask(root)`, `App.taskSkeleton()`, `App.reportPopup(task, code)` | Sau khi chèn trang chi tiết; skeleton đúng hình; popup báo cáo theo phiên bản. |
| Tiện ích | `App.esc, av, nm, dt, dtt, when, fill, isSeen, markSeen, dueOf` |
| `DATA.*` (data.js) | `ME {admin:'PQ',boss:'CT',emp:'LM'}` · `BOSS` · `ADMIN` · `USERS` (được giao/chuyển giao = EMPLOYEE+BOSS) · `ALL_USERS` (mọi người dùng, kể cả Admin — hộp Giao lại) · `roleOf(c)` · `normId(id)` (CV-1033 → 26-0033) · `TEMPLATES` / `templatesFor(t)` / `tyKey(t)` · `tasks()` · `scenario()` |
| `TaskForm.*` (task-form.js) | `mount`, `openDrawer`, `closeDrawer`, `page`, `store` (việc mới, mã `YY-NNNN`), **`drafts`** (nháp trên trình duyệt: `all get put remove title`), `draftMenu(btn, d)`, `draftTime(d)`, `apply`. |

## 3. Class chính (app.css)

- **Token**: `--canvas --surface --surface-2 --lane --line --line-2 --ink --ink-2 --ink-3 --primary(-ink/-soft/-hover) --c-draft/approval/pickup/progress/review/done --danger(-ink/-hover) --amber`, bóng `--shadow-1/2/pop/drawer`, bo `--r-sm 6 / --r-ctl 8 / --r-card 12 / --r-pill`.
- **Chữ**: `--f-head` Lexend (tiêu đề, số lớn) · `--f-body` Noto Sans (nội dung) · `--f-mono` JetBrains Mono **chỉ** cho mã CV/HD, phiên bản, số, ngày. Thang: 12 / 13 / 14 / 17 (tiêu đề hộp thoại) / 22 (H1 trang) / 24 (tiêu đề chi tiết).
- **Shell**: `.app .sb .brand .nav .nav-h .sb-foot .main .top .crumb .top-search .pop .n-item .menu .mi .content .head .head-act`
- **Nút**: `.btn` + `.btn-p` (chính) `.btn-ghost` `.btn-danger` `.btn-neg` (phụ cho hành động tiêu cực) `.btn-link` `.btn-q` (thanh công cụ); cỡ `.btn-sm` `.btn-lg`; icon `.icon-btn(.sm)` `.mini`; ★ `.starb[aria-pressed]`
- **Ô nhập**: `.field > .lbl(.req/.opt) + .input|.select|.ta + .err|.hint`; `.search`; `.check`; `.dropz` + `.flist`
- **Khác**: `.tabs .tab` · `.seg` · `.av(.av-sm/.av-lg) .avs` · `.stat > .sdot` với `.s-<STATUS>` / `.as-<trạng thái người làm>` / `.ex-<đơn gia hạn>` · `.flag(-urgent/-high)` `.pr-<p>` · `.due-<tone>` · `.chip` `.fchip` · `.card .card-h .card-b` · bảng `.tbl(--cols) .thead .th .tr .td (.td-main .td-end .td-hide)` · `.dlg-wrap .dlg(.sm/.lg) .dlg-h .dlg-b .dlg-f .tk .note(.warn/.bad)` · `.dr .dr-h .dr-b .dr-f` · `.toasts .toast` · `.state(.page/.bad)` · `.sk(.line/.circle)` · `.pv`
- **Khối có khung**: `.blk > .blk-h` (icon 16px + `h2/h3` + `.cnt` đếm mono + `.aux` bên phải) `+ .blk-b(.flush)` — viền 1px, bo 12, nền surface. Lưới nhãn/giá trị kẻ ô `dl.kvg` (2 cột, nhãn 12px ink-3 trên giá trị 14px). Bình luận `.cmc-list > .cmc > .cmc-h + .cmc-b` (mỗi bình luận một ô nền surface-2 bo 10).
- **Chi tiết công việc**: drawer `.dr-b.td-blocks` (nền canvas, các `.blk` cách 12px) `.dr-hero .jr .holder .prose .files .file .cbox`; trang `.td-head .td-nudge .td-tools .td-acts` · thanh tóm tắt `.td-sum > dl > .sm-c` (6 → 3 → 2 cột, kẻ dọc) · `.td-jr` + `.jr.jr-c` (hành trình gọn) · `.td-grid` · `.rr` `.kv1` `.hist` `.ext`. Nút ⋯ trên dòng: `.qa-btn`.

## 4. Quy tắc

1. Mỗi màn chỉ **1 nút primary**. Hành động phá huỷ dùng `.btn-danger` trong hộp xác nhận.
2. Nút đóng hộp thoại/ngăn luôn ghi **"Đóng"** (`app.close`); không dùng "Hủy" để tránh nhầm với *Hủy công việc*.
3. Trạng thái = **chấm màu + chữ**; không pill nền màu. Không gradient, không emoji.
4. Nhãn đặt **trên** ô nhập; lỗi đặt **dưới** ô (`.err`, có icon, `aria-invalid`).
5. Mọi chữ qua I18N; khoá mới thêm **cả vi + en**, ngắn, sentence case, tiếng Anh kiểu SaaS. Tiền tố: `app.` (khung, hộp thoại chung), `td.` (chi tiết), `tl.` (danh sách), `dnd.` (kéo thả), trang mới dùng tiền tố riêng.
6. Đủ trạng thái **đang tải (skeleton đúng hình) / rỗng / lỗi / không quyền / không tìm thấy**.
7. Responsive 390 / 768 / 1280: **không cuộn ngang trang** (chỉ cuộn trong khung như hành trình, bảng cột). ≤1023 sidebar thành ngăn kéo; ≤680 bảng thành dòng 2 tầng, hộp thoại trượt từ dưới, khu hành động chi tiết thành thanh dính đáy.
8. Focus thấy được; nút chỉ có icon phải có `aria-label`; tôn trọng `prefers-reduced-motion`.
9. Trang chưa làm: link có `data-soon` → toast "đang thiết kế".

## 5. Thao tác nhanh ⋯ · khối có khung · thanh tóm tắt (cập nhật 22/10 theo góp ý chủ dự án)

**Menu ⋯** (`App.quickMenu`) — cuối mỗi dòng Danh sách (thay mũi tên ›) và góc trên mỗi thẻ Bảng. Theo vai trò + trạng thái, nhóm cách nhau bằng `<hr>`:
1. Xem nhanh (mở ngăn chi tiết) · Mở trang đầy đủ · Sao chép mã
2. Hành động nghiệp vụ hợp lệ lúc đó, theo thứ tự: Duyệt · Từ chối · Nhận việc · Từ chối nhận · Báo cáo xong · Bổ sung báo cáo · Nghiệm thu · Yêu cầu làm lại · Xin gia hạn · Chuyển giao · Khôi phục — lấy từ `App.task.actions`, chạy bằng `App.act` (đúng hộp thoại)
3. Sửa (khi `canEdit`) · Đánh dấu quan trọng (chỉ Trưởng phòng)
4. Hủy công việc (đỏ, hộp thoại có lý do)

Không hợp lệ thì **không hiện** (không làm mờ). Trang phải `stopPropagation` khi bấm ⋯ để không mở ngăn chi tiết; trong dòng, phím Enter/Space trên nút ⋯ không mở drawer. Bàn phím: Enter mở, ↑↓ Home End di chuyển, Esc đóng và trả focus về ⋯. Sau hộp thoại focus quay về ⋯. ⋯ trong chi tiết (drawer/trang) gồm: Sao chép mã · (Sửa – chỉ drawer) · Xin gia hạn / Chuyển giao / Khôi phục · Hủy.

**Danh sách**: cột `Mã (mono, ink-3) | Công việc (★ + tiêu đề) | Ưu tiên (cờ + chữ, màu theo mức, sắp xếp được) | Người làm | Trạng thái | Hạn | ⋯`. 681–1100px ẩn cột Người làm. ≤680 dòng 3 tầng: [mã · ưu tiên … ⋯] / tiêu đề 2 dòng / [trạng thái · hạn … người làm].

**Ngăn chi tiết**: đầu (mã, Helpdesk, ★, ⋯, tiêu đề) trên nền canvas, rồi các khối: Thông tin (`kvg` 8 ô) · Hành trình · (Lý do hủy) · Mô tả · Báo cáo · Bình luận (3 mới nhất, ô soạn cuối khối). Chân: dòng nhắc lượt + nút chính.

**Trang chi tiết**: hàng meta (mã · Helpdesk · chế độ) → tiêu đề + dòng nhắc nhỏ `td.turn.*` ("Đến lượt bạn duyệt · đang chờ 2 ngày") hoặc câu chờ `td.wait.*`; bên phải cụm nút gọn cỡ thường `[phụ][chính] | ★ Sửa ⋯`. Không còn khối "Đến lượt bạn" lớn. Dưới là **thanh tóm tắt** `.td-sum`: Trạng thái | Ưu tiên | Hạn (+ đã gia hạn n/5) | Người làm | Người tạo | Loại. Hành trình gọn (bước 16px, ngày dưới tên, người đang giữ việc ở góc phải). Cột chính: khối Mô tả · Kết quả của người làm · tabs Bình luận/Gia hạn/Lịch sử trong một khối. Cột phải (≥1200): Tệp đính kèm · Nguồn Helpdesk · Thông tin thêm (mã + nút sao chép, ngày tạo, chế độ). ≤680: ★ Sửa ⋯ lên hàng "Quay lại", nút chính thành thanh dính đáy (nút cao 44px).

Khoá mới: `tl.colId tl.colMore` · `qa.menu qa.view qa.copy qa.copied qa.starOn qa.starOff` · `td.turn.{approve,review,accept,report,supplement,days,new}` · `td.sum td.extra td.taskId td.pplN td.actions`.


## 6. Thang khoảng cách + dark mode (cập nhật 22/10 — góp ý "màu tối", "khoảng trắng")

**Nhịp khoảng cách**: 4 / 8 / 12 / 16 / 20 / 24 (token `--sp-1..6`). Không dùng 28/32+ cho khoảng cách trong trang.

| Chỗ | Giá trị |
|---|---|
| Thanh trên `.top` | cao 56 |
| `.content` | 20 trên · 24 ngang (`--content-px`) · 88 đáy (chừa thanh preview); ≤1023: 16 ngang |
| `.head` → khối đầu tiên | 16 |
| Giữa các khối/card | 16 (≤680: 12) |
| `.card-h` / `.card-b` | 12 16 0 / 12 16 14 |
| `.blk-h` / `.blk-b` | 10 16 (min 44) / 14 16 16 |
| Hàng bảng `.tr` | 46 một dòng; 48 khi 2 dòng (Helpdesk, Nhân sự); 44 Nhật ký |
| Trạng thái rỗng `.state` | 40 24 (trang lỗi `.state.page` 56) |
| Ngăn trượt `.dr-b` | 20 24 24 |

**Bề rộng**: trang bảng (Công việc, Helpdesk, Nhân sự, Nhật ký, Báo cáo, Tổng quan) dùng hết chiều ngang. Trang nội dung/form có trần: Cài đặt `.set` 1120 (nav 208 + 32 + nội dung), Hồ sơ `.pf` 1040, Thông báo 960. Khối không kéo cao bằng nhau khi nội dung ít (Tổng quan: `align-items:start`, riêng hàng biểu đồ Hiệu suất/Trạng thái giữ bằng nhau). Thanh dính đáy tràn ngang (`.tf-bar`) bám `--content-px`.

**Dark** (`html[data-theme="dark"]`) — xám lạnh ít bão hoà, không #000:
- Lớp nền: `--canvas #0F1216` < `--surface #161A20` < `--surface-2 #1D2229` < `--pop #232932` < `--pop-2 #2B323C`; sidebar `#13161B`; ngăn trượt nền `#171B21` + khối `#1E232B`.
- Viền `--line #2A3039` (1.3:1 trên surface), `--line-2 #3A414C`, trong lớp nổi `--pop-line #363E49`.
- Chữ `--ink #E6E9EF` (14.4:1) · `--ink-2 #A9B1BE` (8.1:1) · `--ink-3 #818A99` (5.0:1) trên surface.
- `--primary #86A8F2` cho chữ/điểm nhấn; nút chính dùng `--primary-fill #3D6AD6` chữ trắng (5.0:1) — không còn nút xanh sáng chói. Nút nguy hiểm `--danger-fill #C9463C`.
- Bóng gần như bỏ (`--shadow-1:none`); lớp nổi (menu, dropdown, hộp thoại, gợi ý @, tooltip, thanh preview) đặt lại `--surface/--surface-2/--line` = `--pop/--pop-2/--pop-line` nên nổi bằng nền sáng hơn + viền. Toast dark dùng nền `--pop-2` (không dùng nền `--ink`). Avatar dịu bớt `filter`.
- Token mới dùng cả 2 theme: `--primary-fill(-hover/-ink) --danger-fill(-hover) --pop --pop-2 --pop-line --seg-on --sp-1..6 --content-px`.

## 7. Phase A = UI/UX, hành vi giữ nguyên V1 (cập nhật 22/10 — bước A0)

Chủ dự án chốt: ai được làm gì, bước chuyển, điều kiện hiện nút, giới hạn số, email/thông báo **giữ như code V1**; preview chỉ đổi giao diện. Chỗ service và UI V1 lệch nhau → **theo UI V1** (thứ người dùng đang thấy) và ghi chú `UI≠` ngay trong `app.js`.

**Nhãn Phase B** — phần preview mà V1 chưa có backend: `<span class="phase-b">Phase B</span>` (hoặc `App.phaseB()`): viền nét đứt, chữ mono 10px in hoa, **không** nền màu. Đang gắn ở: nút Xuất Excel danh sách việc (Danh sách, Bảng), tab "Nháp trên máy này", nút Lưu nháp, tiêu đề nháp. Khoá: `app.phaseB`, `app.phaseB.d`. Tính năng mới khác (Bảng Kanban, trang Thông báo…) chưa gắn — chủ dự án quyết.

**Nháp lưu tạm trên trình duyệt (Phase B)** — `TaskForm.drafts`, `localStorage['tf-drafts-v1']`, mỗi nháp `{id:'d…', cr, ts, f:<dữ liệu form>}`, chỉ người lưu thấy:
- Không tạo việc DRAFT, không cấp mã việc, không vào danh sách/bảng việc thật (V1: DRAFT có trong enum nhưng không có luồng tạo, danh sách lọc bỏ).
- Đóng ngăn Tạo việc khi đã nhập → hỏi **[Bỏ] [Tiếp tục sửa] [Lưu nháp]**.
- Danh sách: tab **"Nháp trên máy này"** (nhãn Phase B + ghi chú "Chỉ lưu trên trình duyệt này"); bấm nháp → ngăn Tạo việc có sẵn dữ liệu; ⋯ → Mở nháp · Mở trang đầy đủ (`task-form.html?draft=<id>`) · Xóa nháp.
- Bấm **Tạo công việc** từ nháp → cấp mã mới `26-NNNN`, xoá nháp.
- Bảng Kanban bỏ cột Nháp.

**Mã việc** V1 `YY-NNNN` (`26-0033`) ở mọi chỗ của Danh sách/Bảng/Chi tiết/Biểu mẫu. URL `task.html?id=26-0033`; link cũ `?id=CV-1033` vẫn mở được qua `DATA.normId`.

## 8. Luật V1 đang dùng trong preview (nguồn)

| Việc | Luật | Nguồn V1 |
|---|---|---|
| Hiện nút | Port 1:1 `getAllowedActions` + `useTaskPermissions` → `App.task.perm/actions` | `taskActionMatrix.ts`, `useTaskPermissions.ts`, `TaskActionButtons.tsx` |
| Thấy việc | ADMIN/BOSS: hết. Nhân viên: việc mình tạo + việc mình được giao (mọi trạng thái người làm, kể cả Đã xong), trừ Chờ duyệt | `task-query.service.ts:195-210` |
| Trạng thái người làm | Enum V1: `PENDING IN_PROGRESS COMPLETED REJECTED TRANSFERRED REVISION_REQUIRED`; Nhận việc = IN_PROGRESS ngay; Báo cáo = COMPLETED. Nhãn: Chờ nhận · Đang làm · Đã báo cáo · Từ chối · Đã chuyển giao · Cần làm lại | `schema.prisma`, `acknowledge.service.ts` |
| Lý do | Từ chối kế hoạch: **không bắt buộc**. Từ chối nhận, Hủy, Xin gia hạn, Yêu cầu làm lại, ghi chú Chuyển giao: **không rỗng** (không có tối thiểu ký tự) | `ReasonModal`, `TransferModal`, `RequestExtensionModal`, `RejectReviewModal` |
| Báo cáo / Bổ sung | Nội dung ≥10 ký tự (UI). Báo cáo có ô **Mẫu hoàn thành** (mẫu chung + mẫu cùng loại việc). Tệp: 3 tệp, 10 MB, PDF/JPG/PNG/DOCX/XLSX/PPTX, lỗi đầu tiên thì dừng. Dán ảnh Ctrl+V → hộp xem trước | `CompleteTaskModal.tsx`, `SupplementReportModal.tsx`, `attachment-rules.ts`, `completion-templates/route.ts` |
| Bổ sung báo cáo | Chỉ Phê duyệt, việc Đang làm/Chờ nghiệm thu, người làm đã COMPLETED | `useTaskPermissions.ts:121-125` |
| Xin gia hạn | Người làm IN_PROGRESS, việc IN_PROGRESS, chỉ Phê duyệt (UI); tối đa 2 đơn chờ, 5 đơn; ngày > hạn, > hôm nay, > đơn đang chờ. Rút đơn = REJECTED (không có trạng thái riêng) | `extension.service.ts:32-110,225-250`, `useTaskPermissions.ts:113` |
| Chuyển giao | Việc + người làm IN_PROGRESS, không Bắt buộc. Danh sách = EMPLOYEE+BOSS trừ mình và mọi người đã có trong việc | `assignment.service.ts:25-122`, `TransferModal`, `assignable-users` |
| Từ chối việc được chuyển giao | Người chuyển quay lại IN_PROGRESS, lịch sử "trả lại", thông báo "Công việc được trả lại" | `assignment.service.ts:148-214` |
| allFailed / Giao lại | Mọi người làm REJECTED/TRANSFERRED → banner; **Admin** có nút Giao lại (chọn nhiều, việc về Chờ nhận việc); người tạo nhân viên được Hủy; Vice Manager không có nút (UI≠ service) | `useTaskPermissions.ts:69-71`, `TaskActionButtons.tsx:57-59`, `taskActionMatrix.ts:186-190` |
| Hủy | Admin: Chờ duyệt/Chờ nhận/Đang làm/Chờ nghiệm thu. Vice Manager: Chờ nhận/Đang làm (UI≠). Nhân viên tạo: Chờ duyệt, hoặc khi allFailed. Mọi người làm → REJECTED | `taskActionMatrix.ts`, `lifecycle.service.ts:198-283` |
| Khôi phục | **Chỉ Admin**, cần trạng thái trước khi hủy; mọi người làm về Chờ nhận | `restore.service.ts` |
| Sửa | Admin/Vice Manager: Chờ duyệt/Chờ nhận/Đang làm (UI≠: service cho cả Chờ nghiệm thu). Nhân viên: theo ma trận | `taskActionMatrix.ts` |
| Bình luận | Ai thấy việc thì bình luận; **không khoá** khi Đã xong/Đã hủy; sửa: tác giả; xoá: tác giả hoặc **Admin** | `comment.service.ts:98-217` |
| Email | Admin **không** nhận email việc (ghi chú trong hộp thông báo của Admin) | `_shared.ts:111-155` |
| Danh sách | Tab: Cần tôi xử lý · Đang mở · (★ Quan trọng · Mới xong — Admin/Vice Manager) · Đã xong · Đã hủy · Nháp trên máy này. Bảng lọc: Trạng thái, Ưu tiên, Loại, Nguồn (TechOps/Helpdesk), Hạn (Hôm nay/7 ngày/30 ngày/Quá hạn/Từ–đến, theo hạn hoàn thành) + chip + Xóa bộ lọc. V1 không có lọc Người làm/Người tạo. Phân trang 10/20/50/100 (mặc định 20). "Đánh dấu đã xem tất cả" ở Mới xong | `TaskListFilters.tsx`, `DateFilter.tsx`, `TaskListPagination.tsx`, `TaskListClient.tsx:169-179` |

Khoá mới (vi + en) nằm ở khối "Bước A0" cuối từ điển trong `copy.js` (ghi đè khoá cùng tên phía trên): `role.admin pv.grants* pv.idle idle.* app.phaseB* notif.adminNoMail n.allFailed n.transfer act.reassign app.dlg.{ra.*,tpl*,decline.back,restore.ppl,tr.hint,tr.noteErr,cmDel.dOther} app.toast.{returned,allFailed,reassigned} td.af.* td.as.{COMPLETED,REJECTED,REVISION_REQUIRED} td.h.{returned,allFailed,reassigned} view.cancelled tl.f.* tl.pg.* tl.seenAll* dr.local dr.saved tf.na.review`. Khoá `td.as.ACCEPTED/REPORTED/REWORK/DECLINED` cũ vẫn giữ cho trang Báo cáo (agent sau đổi).

CSS mới (`app.css`, khối "Bước A0"): `.phase-b`, `.as-COMPLETED/REJECTED/REVISION_REQUIRED`, `.td-af`, `.pop-note`, `.toast.idle`, `.fthumb`, `.dz-rules`; trong `tasks-list.html`: `.fpanel .fp-grid .fchips .pager .pg-* .dl-*`.
