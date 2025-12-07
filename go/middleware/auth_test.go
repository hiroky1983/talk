package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/hiroky1983/talk/go/internal/auth"
	"github.com/stretchr/testify/assert"
)

func init() {
	// Set gin to test mode
	gin.SetMode(gin.TestMode)
}

func TestJWTAuthMiddleware_WithValidToken(t *testing.T) {
	// Setup JWT manager
	os.Setenv("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
	jwtManager, err := auth.NewJWTManager()
	assert.NoError(t, err)

	// Generate a valid token
	token, err := jwtManager.GenerateAccessToken("test-user-123", "test@example.com")
	assert.NoError(t, err)

	// Setup router
	router := gin.New()
	router.Use(JWTAuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		userID, exists := GetUserID(c)
		assert.True(t, exists)
		assert.Equal(t, "test-user-123", userID)
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})

	// Create request with valid token
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "test-user-123")
}

func TestJWTAuthMiddleware_WithoutToken(t *testing.T) {
	// Setup JWT manager
	os.Setenv("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
	jwtManager, err := auth.NewJWTManager()
	assert.NoError(t, err)

	// Setup router
	router := gin.New()
	router.Use(JWTAuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Create request without Authorization header
	req, _ := http.NewRequest("GET", "/test", nil)

	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Authorization header is required")
}

func TestJWTAuthMiddleware_WithInvalidToken(t *testing.T) {
	// Setup JWT manager
	os.Setenv("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
	jwtManager, err := auth.NewJWTManager()
	assert.NoError(t, err)

	// Setup router
	router := gin.New()
	router.Use(JWTAuthMiddleware(jwtManager))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Create request with invalid token
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")

	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid token")
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
