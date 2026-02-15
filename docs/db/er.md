erDiagram
    refresh_tokens {
      uuid refresh_tokens_id PK
      uuid user_id FK
      character_varying(500) token
      timestamptz expires_at
      timestamptz created_at
    }
    refresh_tokens }o--o| users : fk_refresh_tokens_user
    users {
      uuid users_id PK
      character_varying(255) email
      character_varying(255) password_hash
      character_varying(100) username
      timestamptz created_at
      timestamptz updated_at
      character_varying(20) gender
      character_varying(50) plan
    }
