package models

import (
	"time"

	"github.com/uptrace/bun"
)

// User represents a user in the system
type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID        int64     `bun:"id,pk,autoincrement"`
	Email     string    `bun:"email,notnull,unique"`
	Name      string    `bun:"name,notnull"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}
