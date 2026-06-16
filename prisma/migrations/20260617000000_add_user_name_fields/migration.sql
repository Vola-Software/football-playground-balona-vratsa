-- Add firstName, lastName (mandatory at registration, nullable for existing rows)
-- and username (optional, unique)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName"  TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username"  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key"
ON "User" ("username")
WHERE "username" IS NOT NULL;
