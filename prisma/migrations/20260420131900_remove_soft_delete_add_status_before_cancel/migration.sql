-- DropIndex
DROP INDEX "Task_isDeleted_status_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "deletedAt",
DROP COLUMN "isDeleted",
ADD COLUMN     "statusBeforeCancel" "TaskStatus";

-- AlterTable
ALTER TABLE "UserProfile" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Bangkok';
