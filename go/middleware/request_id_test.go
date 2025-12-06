package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequestIDMiddleware_GeneratesUUID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		requestID, exists := GetRequestID(c)
		assert.True(t, exists, "Request ID should exist in context")
		assert.NotEmpty(t, requestID, "Request ID should not be empty")
		c.String(http.StatusOK, requestID)
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotEmpty(t, w.Header().Get(RequestIDHeader))
}

func TestRequestIDMiddleware_UsesProvidedRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	providedID := "custom-request-id-123"

	router := gin.New()
	router.Use(RequestIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		requestID, exists := GetRequestID(c)
		assert.True(t, exists, "Request ID should exist in context")
		assert.Equal(t, providedID, requestID, "Request ID should match provided ID")
		c.String(http.StatusOK, requestID)
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set(RequestIDHeader, providedID)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, providedID, w.Header().Get(RequestIDHeader))
	assert.Equal(t, providedID, w.Body.String())
}

func TestRequestIDMiddleware_SetsResponseHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotEmpty(t, w.Header().Get(RequestIDHeader))
}

func TestGetRequestID_WhenRequestIDExists(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	expectedID := "test-request-id"
	c.Set(RequestIDKey, expectedID)

	requestID, exists := GetRequestID(c)

	assert.True(t, exists, "Request ID should exist")
	assert.Equal(t, expectedID, requestID, "Request ID should match")
}

func TestGetRequestID_WhenRequestIDDoesNotExist(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, _ := gin.CreateTestContext(httptest.NewRecorder())

	requestID, exists := GetRequestID(c)

	assert.False(t, exists, "Request ID should not exist")
	assert.Empty(t, requestID, "Request ID should be empty")
}

func TestGetRequestID_WhenRequestIDIsNotString(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set(RequestIDKey, 12345) // Setting non-string value

	requestID, exists := GetRequestID(c)

	assert.False(t, exists, "Request ID should not exist when type is wrong")
	assert.Empty(t, requestID, "Request ID should be empty")
}
