-- Align database schema with GORM model definitions
-- Rename PK columns to match tablename_id convention and add missing columns

-- Step 1: Drop FK constraint before renaming PKs
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_user_id_fkey";

-- Step 2: Rename PK columns
ALTER TABLE "users" RENAME COLUMN "id" TO "users_id";
ALTER TABLE "refresh_tokens" RENAME COLUMN "id" TO "refresh_tokens_id";

-- Step 3: Add missing columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" character varying(50) NOT NULL DEFAULT 'PLAN_FREE';

-- Step 4: Re-create FK constraint with correct column reference
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user"
  FOREIGN KEY ("user_id") REFERENCES "users" ("users_id") ON DELETE CASCADE;

-- Step 5: Remove duplicate unique constraints (keep GORM-generated unique indexes)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_token_key";
