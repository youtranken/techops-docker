# TechOps — Quy tắc làm việc cho Claude

Trả lời và viết tài liệu bằng **tiếng Việt**. Quy ước module xem `src/modules/AGENTS.md`.

## 1. Database — KHÔNG sửa bảng hiện có

- Schema DB hiện tại **giống Prod**. Không sửa/xoá/đổi tên bảng, cột, enum, index đang có.
- Cần thêm bảng/cột/enum mới cho tính năng mới → **dừng lại, báo user (kèm migration SQL dự kiến) và chờ duyệt** trước khi viết migration.
- Không chạy `prisma migrate dev`, `prisma db push`, `prisma migrate reset` trên DB local khi chưa được duyệt.
- ⚠️ `docker-entrypoint.sh` tự chạy `prisma migrate deploy` khi container `app` khởi động → mọi thư mục mới trong `prisma/migrations/` sẽ được áp vào DB. Kiểm tra `prisma/migrations/` trước khi `docker compose up app`.

## 2. Luồng nghiệp vụ — báo trước khi đổi

Bất kỳ thay đổi nào về luồng xử lý (chuyển trạng thái task, DIRECT/APPROVAL, ai được làm gì, thông báo/email, helpdesk sync) → **mô tả hành vi cũ → mới và chờ user duyệt** trước khi code. Sửa lỗi bảo mật/bug không đổi hành vi dự kiến thì làm luôn nhưng vẫn nêu rõ trong báo cáo.

## 3. TDD bắt buộc: Đỏ → Xanh → Refactor

1. **Đỏ:** viết test mô tả hành vi mong muốn (hoặc tái hiện bug) → chạy, **thấy test FAIL đúng lý do** (dán output).
2. **Xanh:** viết code tối thiểu để test PASS → chạy lại, dán output.
3. **Refactor:** dọn code khi test vẫn xanh.

- Unit/service test: Vitest (`npx vitest run <file>`), đặt trong `__tests__/` cạnh code.
- Không sửa test cho "qua" nếu không hiểu vì sao nó fail — test sai thì nói rõ lý do sửa.
- Bug fix luôn kèm test tái hiện bug.

## 4. E2E

- Playwright chạy trên Docker local (`http://localhost:3000`), test đặt trong `e2e/`.
- Mỗi luồng UI bị ảnh hưởng (tạo/giao/hoàn thành task, duyệt, lọc danh sách, Kanban, Lịch, checklist…) phải có ít nhất 1 kịch bản E2E happy path.
- E2E không được ghi dữ liệu rác lâu dài vào DB: dùng dữ liệu có tiền tố `[E2E]` và dọn sau khi chạy.

## 5. Definition of Done (DoD)

Một việc chỉ được báo "xong" khi đủ:

- [ ] Test viết theo TDD (có bằng chứng Đỏ → Xanh)
- [ ] `npx vitest run` — **toàn bộ** xanh
- [ ] `npx tsc --noEmit` — không lỗi
- [ ] E2E của luồng bị ảnh hưởng — xanh trên Docker local
- [ ] `docker compose up -d --build app` build + chạy được, `/api/health` trả 200
- [ ] Không đổi bảng DB hiện có; migration mới (nếu có) đã được user duyệt
- [ ] Thay đổi luồng nghiệp vụ (nếu có) đã được user duyệt
- [ ] Cập nhật `AGENTS.md`/docs liên quan
- [ ] Liệt kê file thay đổi để deploy Prod

## 6. Deploy

- Prod là máy khác. Tạm thời deploy bằng **copy file tay** (GitHub chưa push được) → luôn đưa danh sách file thay đổi; file có thay đổi dở dang khác thì hướng dẫn sửa tay từng đoạn.
- Prod: `docker compose up -d --build app`. `.env` Prod dùng **domain** cho `HELPDESK_API_URL` (không dùng IP).
