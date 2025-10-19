package domain

// UserSettings represents user-specific settings and preferences
type UserSettings struct {
	ID                int64
	UserID            int64
	Language          string
	SelectedCharacter string
	Theme             string
}

// NewUserSettings creates a new UserSettings instance with default values
func NewUserSettings(userID int64) *UserSettings {
	return &UserSettings{
		UserID:   userID,
		Language: "ja",
		Theme:    "light",
	}
}

// UpdateLanguage updates the user's language preference
func (us *UserSettings) UpdateLanguage(language string) {
	us.Language = language
}

// UpdateTheme updates the user's theme preference
func (us *UserSettings) UpdateTheme(theme string) {
	us.Theme = theme
}

// UpdateCharacter updates the user's selected character
func (us *UserSettings) UpdateCharacter(character string) {
	us.SelectedCharacter = character
}
