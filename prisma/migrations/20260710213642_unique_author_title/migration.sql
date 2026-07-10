/*
  Warnings:

  - A unique constraint covering the columns `[author_id,title]` on the table `templates` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "templates_title_key";

-- CreateIndex
CREATE UNIQUE INDEX "templates_author_id_title_key" ON "templates"("author_id", "title");
