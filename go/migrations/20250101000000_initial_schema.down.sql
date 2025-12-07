-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_user_id;

-- Drop tables
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS users;
