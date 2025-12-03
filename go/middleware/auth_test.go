package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func init() {
	// Set gin to test mode
	gin.SetMode(gin.TestMode)
}

func TestAuthMiddleware_WithValidUserID(t *testing.T) {
	// Setup
	router := gin.New()
	router.Use(AuthMiddleware())
	router.GET("/test", func(c *gin.Context) {
		userID, exists := GetUserID(c)
		assert.True(t, exists)
		assert.Equal(t, "test-user-123", userID)
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})

	// Create request with X-User-ID header
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set(UserIDHeader, "test-user-123")

	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "test-user-123")
}

func TestAuthMiddleware_WithoutUserID(t *testing.T) {
	// Setup
	router := gin.New()
	router.Use(AuthMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Create request without X-User-ID header
	req, _ := http.NewRequest("GET", "/test", nil)

	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Unauthorized")
	assert.Contains(t, w.Body.String(), "user_id is required")
}

func TestAuthMiddleware_WithEmptyUserID(t *testing.T) {
	// Setup
	router := gin.New()
	router.Use(AuthMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Create request with empty X-User-ID header
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set(UserIDHeader, "")

	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Unauthorized")
}

func TestGetUserID_WhenUserIDExists(t *testing.T) {
	// Setup
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set(UserIDKey, "test-user-456")

	// Execute
	userID, exists := GetUserID(c)

	// Assert
	assert.True(t, exists)
	assert.Equal(t, "test-user-456", userID)
}

func TestGetUserID_WhenUserIDDoesNotExist(t *testing.T) {
	// Setup
	c, _ := gin.CreateTestContext(httptest.NewRecorder())

	// Execute
	userID, exists := GetUserID(c)

	// Assert
	assert.False(t, exists)
	assert.Empty(t, userID)
}

func TestGetUserID_WhenUserIDIsNotString(t *testing.T) {
	// Setup
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set(UserIDKey, 12345) // Set non-string value

	// Execute
	userID, exists := GetUserID(c)

	// Assert
	assert.False(t, exists)
	assert.Empty(t, userID)
}
