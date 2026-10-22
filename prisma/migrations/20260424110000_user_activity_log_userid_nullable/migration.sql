-- UserActivityLog.userId → nullable + FK ON DELETE SET NULL
-- Lý do: log brute-force attempt với username không tồn tại (không có user.id để FK)

ALTER TABLE "UserActivityLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "UserActivityLog" DROP CONSTRAINT IF EXISTS "UserActivityLog_userId_fkey";
ALTER TABLE "UserActivityLog" ADD CONSTRAINT "UserActivityLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
