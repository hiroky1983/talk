-- Create "users" table
CREATE TABLE "users" (
  "users_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "username" varchar(100) NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "plan" varchar(50) NOT NULL DEFAULT 'PLAN_FREE',
  "created_at" timestamptz,
  "updated_at" timestamptz,
  PRIMARY KEY ("users_id")
);

-- Create index "idx_users_email" to table: "users"
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");

-- Create "refresh_tokens" table
CREATE TABLE "refresh_tokens" (
  "refresh_tokens_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "token" varchar(500) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz,
  PRIMARY KEY ("refresh_tokens_id"),
  CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users" ("users_id") ON DELETE CASCADE
);

-- Create index "idx_refresh_tokens_token" to table: "refresh_tokens"
CREATE UNIQUE INDEX IF NOT EXISTS "idx_refresh_tokens_token" ON "refresh_tokens" ("token");

-- Create index "idx_refresh_tokens_user_id" to table: "refresh_tokens"
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
