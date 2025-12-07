package models

import (
	"time"

	"github.com/uptrace/bun"
)

// Conversation represents a conversation session
type Conversation struct {
	bun.BaseModel `bun:"table:conversations,alias:c"`

	ID        int64     `bun:"id,pk,autoincrement"`
	UserID    int64     `bun:"user_id,notnull"`
	Title     string    `bun:"title"`
	Status    string    `bun:"status,notnull,default:'active'"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`

	// Relations
	User *User `bun:"rel:belongs-to,join:user_id=id"`
}
