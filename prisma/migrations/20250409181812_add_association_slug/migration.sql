/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Association` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Association` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Association" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Association_slug_key" ON "Association"("slug");
