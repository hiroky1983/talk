package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hiroky1983/talk/go/internal/auth"
)

const (
	// UserIDKey is the key used to store user_id in gin.Context
	UserIDKey = "user_id"
	// EmailKey is the key used to store email in gin.Context
	EmailKey = "email"
)

// JWTAuthMiddleware validates JWT tokens and extracts user information
func JWTAuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if it's a Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format. Expected: Bearer <token>",
			})
			c.Abort()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := jwtManager.ValidateToken(token)
		if err != nil {
			if err == auth.ErrExpiredToken {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Token has expired",
				})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid token",
				})
			}
			c.Abort()
			return
		}

		// Store user information in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(EmailKey, claims.Email)

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

// GetEmail retrieves the email from gin.Context
func GetEmail(c *gin.Context) (string, bool) {
	email, exists := c.Get(EmailKey)
	if !exists {
		return "", false
	}

	emailStr, ok := email.(string)
	return emailStr, ok
}
