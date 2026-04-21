# 🚀 Deploy Checklist — TechOps Production

> **Tài liệu này liệt kê TỪNG BƯỚC cần làm trước khi deploy code Q2/2026 lên Production.**
> Thực hiện đúng thứ tự. Đánh dấu ✅ từng bước sau khi hoàn thành.

**Code branch:** main / feature/q2-refactor  
**Ngày tạo checklist:** 2026-04-15  
**Owner:** Leminh

---

## 0. Trước khi làm bất cứ thứ gì

```bash
# Backup database production (bắt buộc)
docker exec techops-postgres pg_dump -U postgres techops > backup_$(date +%Y%m%d_%H%M).sql

# Kiểm tra orphan rows (từ migration FK cascades)
docker exec techops-postgres psql -U postgres techops -c "
  SELECT 'TaskAssignee orphan' as check, COUNT(*) FROM \"TaskAssignee\" ta
    LEFT JOIN \"Task\" t ON t.id = ta.\"taskId\" WHERE t.id IS NULL
  UNION ALL
  SELECT 'AssigneeReport orphan', COUNT(*) FROM \"AssigneeReport\" ar
    LEFT JOIN \"TaskAssignee\" ta ON ta.id = ar.\"assigneeId\" WHERE ta.id IS NULL
  UNION ALL
  SELECT 'ReportAttachment orphan', COUNT(*) FROM \"ReportAttachment\" ra
    LEFT JOIN \"AssigneeReport\" ar ON ar.id = ra.\"reportId\" WHERE ar.id IS NULL;
"
# Nếu count > 0 → cleanup trước khi deploy (xem mục 4B bên dưới)
```

---

## 1. Chuẩn bị file .env (máy production)

Mở file `.env` trên server, **thêm** các dòng còn thiếu:

```env
# ── MỚI: Encrypt SMTP password at rest ────────────────────────────────────────
# Tạo bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SMTP_ENCRYPT_KEY=<64_hex_chars>

# ── MỚI: Timezone (mặc định Asia/Bangkok — UTC+7, cùng VN) ───────────────────
APP_TIMEZONE=Asia/Bangkok

# ── CHỈ CẦN nếu DB hoàn toàn trống (first deploy) ────────────────────────────
ADMIN_INITIAL_PASSWORD=<password_manh_min_8_ky_tu>
```

> ⚠️ **Không commit `.env` lên git.**  
> `.env.example` đã được cập nhật để làm mẫu.

### Rotate secrets (thực hiện 1 lần)

```bash
# 1. Tạo AUTH_SECRET mới (force logout toàn bộ user — thông báo trước)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → Cập nhật AUTH_SECRET= trong .env

# 2. Tạo SMTP_ENCRYPT_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → Cập nhật SMTP_ENCRYPT_KEY= trong .env

# 3. Đổi POSTGRES_PASSWORD mạnh hơn (nếu chưa làm)
#    a. Đổi trong .env
#    b. Đổi trong DB:
#       docker exec techops-postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'new_strong_password';"

# 4. Đặt Redis password (nếu chưa có)
#    Thêm vào redis.conf: requirepass <strong_password>
#    Cập nhật REDIS_URL=redis://:<password>@redis:6379 trong .env
```

---

## 2. Tạo Prisma Migration Baseline (quan trọng nhất)

> ❗ Nếu bỏ qua bước này, container sẽ **crash khi khởi động** vì `prisma migrate deploy` không tìm thấy migration history.

**Thực hiện trên máy DEV (không phải prod):**

```bash
cd E:/PMH/techops_docker/techops-docker

# Bước 2a: Tạo baseline từ schema hiện tại
# (Lệnh này TẠO file migration nhưng KHÔNG apply lên DB)
npx prisma migrate dev --name initial --create-only

# Bước 2b: Kiểm tra thư mục vừa tạo
ls prisma/migrations/
# Phải thấy: <timestamp>_initial/migration.sql

# Bước 2c: Commit migrations vào git
git add prisma/migrations/
git commit -m "chore: add prisma migration baseline"
```

**Sau khi deploy lên prod, chạy migration FK cascades:**

```bash
# Xem file: prisma/migrations/20260415_add_fk_cascades.sql
# Chạy thủ công trên prod DB (sau khi đã cleanup orphan rows ở bước 0):
docker exec -i techops-postgres psql -U postgres techops < prisma/migrations/20260415_add_fk_cascades.sql
```

---

## 3. Deploy code

```bash
# Pull code mới
git pull origin main

# Build lại Docker image
docker compose build --no-cache

# Restart (zero-downtime nếu dùng rolling update, hoặc có downtime ~30s)
docker compose down && docker compose up -d

# Theo dõi log khởi động
docker compose logs -f techops-app
```

**Kết quả mong đợi trong log:**
```
→ [1/3] Running database migrations (prisma migrate deploy)...
✅ Migrations applied
→ [2/3] Checking initial data (seed)...
✅ Đã có N user, bỏ qua seed
→ [3/3] Starting Next.js production server...
```

---

## 4. Sau khi deploy — kiểm tra

### 4A. SMTP encryption (bắt buộc)

Vì SMTP password cũ trong DB là plaintext, sau khi deploy **phải re-save** để mã hóa:

1. Đăng nhập Admin
2. Vào **Settings → Email → SMTP Config**
3. Nhập lại **App Password** Gmail (giữ nguyên, chỉ cần nhập lại)
4. Bấm **Lưu**
5. Bấm **Test kết nối** → phải thấy ✅

### 4B. Nếu có orphan rows (từ kết quả bước 0)

```sql
-- Xóa orphan TaskAssignee (task đã xóa khỏi DB)
DELETE FROM "TaskAssignee" WHERE "taskId" NOT IN (SELECT id FROM "Task");

-- Xóa orphan AssigneeReport
DELETE FROM "AssigneeReport" WHERE "assigneeId" NOT IN (SELECT id FROM "TaskAssignee");

-- Xóa orphan ReportAttachment
DELETE FROM "ReportAttachment" WHERE "reportId" NOT IN (SELECT id FROM "AssigneeReport");
```

Sau đó mới chạy migration FK cascades (mục 2, phần cuối).

### 4C. Kiểm tra chức năng chính

```
[ ] Đăng nhập OK
[ ] Tạo task DIRECT → assign → nhân viên acknowledge → complete → kiểm tra status COMPLETED
[ ] Tạo task APPROVAL → Boss duyệt plan → nhân viên complete → Boss duyệt review
[ ] Test cancel: creator APPROVAL chỉ hủy được khi PENDING_APPROVAL
[ ] Gửi test email (Settings → SMTP → Test)
[ ] Kiểm tra cron log (không thấy "double register"):
    docker compose logs techops-app | grep -i "cron\|overdue\|deadline"
[ ] Analytics dashboard load OK
[ ] Notification bell hiển thị đúng
```

### 4D. Kiểm tra deactivate user

```
[ ] Admin deactivate 1 user test
[ ] User đó request lại → phải nhận 401 trong ≤30 giây
[ ] Re-activate → đăng nhập lại OK
```

---

## 5. Rollback plan (nếu có sự cố)

```bash
# Restore DB từ backup
docker exec -i techops-postgres psql -U postgres techops < backup_YYYYMMDD_HHMM.sql

# Revert code về version cũ
git checkout <commit_hash_cũ>
docker compose build --no-cache
docker compose down && docker compose up -d
```

---

## 6. Thông báo cho user (nên làm trước deploy)

Gửi thông báo nội bộ:

> **[TechOps] Cập nhật hệ thống — ngày XX/XX/2026**
>
> Hệ thống sẽ bảo trì ~5 phút để cập nhật. Sau khi cập nhật:
> - **Tài khoản sẽ bị đăng xuất** (do đổi session secret) — vui lòng đăng nhập lại
> - Quy trình **APPROVAL**: người tạo chỉ hủy/giao lại được khi task chưa được Boss duyệt kế hoạch
> - Email thông báo sẽ tuân theo cài đặt **Notification Preferences** của từng người

---

## 7. Biến đổi hành vi sau deploy (so với trước)

| Tính năng | Trước | Sau |
|---|---|---|
| Creator cancel APPROVAL task | Hủy được mọi lúc | Chỉ hủy khi `PENDING_APPROVAL` |
| Creator reassign APPROVAL task | Reassign được | Chỉ Boss/Admin mới reassign được |
| Notification email | Luôn gửi kể cả user đã tắt | Theo đúng cài đặt của user |
| SLA % | Tính cả task CANCELLED | Loại CANCELLED khỏi tổng |
| Overdue reminder | Chỉ task quá hạn trong 1 số status | Gửi đủ IN_PROGRESS + WAITING_ACK |
| SMTP password | Lưu plaintext | Mã hóa AES-256-GCM (sau khi re-save) |
| Transfer loop | Có thể chuyển vòng A→B→A | Bị chặn |

---

## 8. Open questions (cần Leminh quyết trước deploy)

- [ ] **AUTH_SECRET rotate**: Chấp nhận force logout tất cả user ngay, hay giữ secret cũ thêm 1 tuần?
- [ ] **FK Cascades**: Đã kiểm tra production DB chưa có orphan rows chưa?
- [ ] **Timezone**: Cron hiện đang chạy giờ nào? Sau deploy sẽ shift theo `Asia/Bangkok` (UTC+7, cùng VN) — có ảnh hưởng lịch gửi digest không?

---

*Tạo bởi Claude Code — 2026-04-15*
