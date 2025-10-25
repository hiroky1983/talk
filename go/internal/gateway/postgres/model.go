package postgres

import (
	"time"

	"github.com/uptrace/bun"
	"github.com/hiroky1983/talk/go/internal/domain"
)

// UserModel is the Bun ORM model for users table
type UserModel struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID        int64     `bun:"id,pk,autoincrement"`
	Email     string    `bun:"email,notnull,unique"`
	Name      string    `bun:"name,notnull"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
	DeletedAt *time.Time `bun:"deleted_at,soft_delete"`
}

// ToDomain converts UserModel to domain.User
func (m *UserModel) ToDomain() *domain.User {
	return &domain.User{
		ID:        m.ID,
		Email:     m.Email,
		Name:      m.Name,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
		DeletedAt: m.DeletedAt,
	}
}

// FromDomain converts domain.User to UserModel
func (m *UserModel) FromDomain(u *domain.User) {
	m.ID = u.ID
	m.Email = u.Email
	m.Name = u.Name
	m.CreatedAt = u.CreatedAt
	m.UpdatedAt = u.UpdatedAt
	m.DeletedAt = u.DeletedAt
}

// ConversationModel is the Bun ORM model for conversations table
type ConversationModel struct {
	bun.BaseModel `bun:"table:conversations,alias:c"`

	ID        int64     `bun:"id,pk,autoincrement"`
	UserID    int64     `bun:"user_id,notnull"`
	Title     string    `bun:"title"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}

// ToDomain converts ConversationModel to domain.Conversation
func (m *ConversationModel) ToDomain() *domain.Conversation {
	return &domain.Conversation{
		ID:        m.ID,
		UserID:    m.UserID,
		Title:     m.Title,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

// FromDomain converts domain.Conversation to ConversationModel
func (m *ConversationModel) FromDomain(c *domain.Conversation) {
	m.ID = c.ID
	m.UserID = c.UserID
	m.Title = c.Title
	m.CreatedAt = c.CreatedAt
	m.UpdatedAt = c.UpdatedAt
}

// MessageModel is the Bun ORM model for messages table
type MessageModel struct {
	bun.BaseModel `bun:"table:messages,alias:m"`

	ID             int64     `bun:"id,pk,autoincrement"`
	ConversationID int64     `bun:"conversation_id,notnull"`
	Role           string    `bun:"role,notnull"`
	Content        string    `bun:"content,notnull"`
	CreatedAt      time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}

// ToDomain converts MessageModel to domain.Message
func (m *MessageModel) ToDomain() *domain.Message {
	return &domain.Message{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		Role:           domain.MessageRole(m.Role),
		Content:        m.Content,
		CreatedAt:      m.CreatedAt,
	}
}

// FromDomain converts domain.Message to MessageModel
func (m *MessageModel) FromDomain(msg *domain.Message) {
	m.ID = msg.ID
	m.ConversationID = msg.ConversationID
	m.Role = string(msg.Role)
	m.Content = msg.Content
	m.CreatedAt = msg.CreatedAt
}

// UserSettingsModel is the Bun ORM model for user_settings table
type UserSettingsModel struct {
	bun.BaseModel `bun:"table:user_settings,alias:us"`

	ID                int64  `bun:"id,pk,autoincrement"`
	UserID            int64  `bun:"user_id,notnull,unique"`
	Language          string `bun:"language,notnull,default:'ja'"`
	SelectedCharacter string `bun:"selected_character"`
	Theme             string `bun:"theme,default:'light'"`
}

// ToDomain converts UserSettingsModel to domain.UserSettings
func (m *UserSettingsModel) ToDomain() *domain.UserSettings {
	return &domain.UserSettings{
		ID:                m.ID,
		UserID:            m.UserID,
		Language:          m.Language,
		SelectedCharacter: m.SelectedCharacter,
		Theme:             m.Theme,
	}
}

// FromDomain converts domain.UserSettings to UserSettingsModel
func (m *UserSettingsModel) FromDomain(s *domain.UserSettings) {
	m.ID = s.ID
	m.UserID = s.UserID
	m.Language = s.Language
	m.SelectedCharacter = s.SelectedCharacter
	m.Theme = s.Theme
}
