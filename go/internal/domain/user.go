package domain

import "time"

// User represents a user in the system
type User struct {
	ID        int64
	Email     string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}

// NewUser creates a new User instance
func NewUser(email, name string) *User {
	now := time.Now()
	return &User{
		Email:     email,
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// IsDeleted returns true if the user is soft-deleted
func (u *User) IsDeleted() bool {
	return u.DeletedAt != nil
}

// Delete marks the user as deleted
func (u *User) Delete() {
	now := time.Now()
	u.DeletedAt = &now
}

// UpdateName updates the user's name
func (u *User) UpdateName(name string) {
	u.Name = name
	u.UpdatedAt = time.Now()
}
