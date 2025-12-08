-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TASK', 'BUG', 'FEATURE', 'IMPROVEMENT', 'SPIKE');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "estimatePoints" INTEGER,
ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'TASK';
