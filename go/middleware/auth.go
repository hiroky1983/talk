package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	// UserIDKey is the key used to store user_id in gin.Context
	UserIDKey = "user_id"
	// UserIDHeader is the HTTP header name for user identification
	UserIDHeader = "X-User-ID"
)

// AuthMiddleware extracts user_id from request headers and validates authentication
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract user_id from X-User-ID header
		userID := c.GetHeader(UserIDHeader)

		// Validate that user_id is present
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized: user_id is required",
			})
			c.Abort()
			return
		}

		// Store user_id in context for downstream handlers
		c.Set(UserIDKey, userID)

		// Continue to next handler
		c.Next()
	}
}

// GetUserID retrieves the user_id from gin.Context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get(UserIDKey)
	if !exists {
		return "", false
	}

	userIDStr, ok := userID.(string)
	return userIDStr, ok
}
