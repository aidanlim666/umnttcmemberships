-- Accounts are gone: purchases now carry the buyer directly.
-- Local held only test rows and production was empty, so dropping the account tables and
-- every order attached to them is intentional.

DROP TABLE IF EXISTS "PasswordReset";
DROP TABLE IF EXISTS "PendingSignup";
DROP TABLE IF EXISTS "VerificationToken";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "Account";

-- Membership cascades from Order, and Order cascaded from User; clear both before the
-- User table goes so no row is left pointing at nothing.
DELETE FROM "Membership";
DELETE FROM "Order";

-- Drop the foreign keys first; Postgres refuses to drop a table another table still
-- references, and CASCADE here would be a blunt instrument.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
ALTER TABLE "Membership" DROP CONSTRAINT IF EXISTS "Membership_userId_fkey";
DROP TABLE IF EXISTS "User";

CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

ALTER TABLE "Order" DROP COLUMN "userId";
ALTER TABLE "Order" ADD COLUMN "buyerName" TEXT NOT NULL;
ALTER TABLE "Order" ADD COLUMN "buyerEmail" TEXT NOT NULL;
ALTER TABLE "Order" ADD COLUMN "skillLevel" "SkillLevel";

ALTER TABLE "Membership" DROP COLUMN "userId";

DROP INDEX IF EXISTS "Order_userId_idx";
DROP INDEX IF EXISTS "Membership_userId_idx";
CREATE INDEX "Order_buyerEmail_idx" ON "Order"("buyerEmail");
