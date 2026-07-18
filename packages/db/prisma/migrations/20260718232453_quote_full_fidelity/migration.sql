/*
  Warnings:

  - Added the required column `configVersion` to the `quotes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thirdPartyCosts` to the `quotes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "configVersion" TEXT NOT NULL,
ADD COLUMN     "thirdPartyCosts" JSONB NOT NULL;
