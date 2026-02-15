package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	UsersID      string    `json:"id" gorm:"primaryKey;type:uuid;column:users_id;default:gen_random_uuid()"`
	Username     string    `json:"username" gorm:"not null;size:100"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null;size:255"`
	PasswordHash string    `json:"-" gorm:"not null;column:password_hash;size:255"`
	Gender       string    `json:"gender" gorm:"type:varchar(20)"`
	Plan         UserPlan  `json:"plan" gorm:"not null;type:varchar(50);default:'PLAN_FREE'"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// RefreshToken represents a refresh token in the system
type RefreshToken struct {
	RefreshTokensID string    `json:"id" gorm:"primaryKey;type:uuid;column:refresh_tokens_id;default:gen_random_uuid()"`
	UserID          string    `json:"user_id" gorm:"not null;type:uuid;index"`
	User            User      `json:"-" gorm:"foreignKey:UserID;references:UsersID;constraint:OnDelete:CASCADE"`
	Token           string    `json:"token" gorm:"uniqueIndex;not null;size:500"`
	ExpiresAt       time.Time `json:"expires_at" gorm:"not null;index"`
	CreatedAt       time.Time `json:"created_at" gorm:"autoCreateTime"`
}

type UserPlan string

const (
	PlanFree    UserPlan = "PLAN_FREE"
	PlanLite    UserPlan = "PLAN_LITE"
	PlanPremium UserPlan = "PLAN_PREMIUM"
)
