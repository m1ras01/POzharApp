-- AlterTable (SQLite: one ADD COLUMN per statement)
ALTER TABLE "Message" ADD COLUMN "admin_reply" TEXT;
ALTER TABLE "Message" ADD COLUMN "admin_replied_at" DATETIME;
ALTER TABLE "Message" ADD COLUMN "admin_replied_by_id" TEXT;
