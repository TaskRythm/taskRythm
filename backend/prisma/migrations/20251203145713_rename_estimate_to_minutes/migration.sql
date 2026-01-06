/*
  Warnings:

  - You are about to drop the column `estimatePoints` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "estimatePoints",
ADD COLUMN     "estimateMinutes" INTEGER;
