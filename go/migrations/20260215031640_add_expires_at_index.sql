-- Create index "idx_refresh_tokens_expires_at" to table: "refresh_tokens"
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");
