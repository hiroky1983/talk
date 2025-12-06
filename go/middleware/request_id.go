package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	// RequestIDKey is the key used to store request_id in gin.Context
	RequestIDKey = "request_id"
	// RequestIDHeader is the HTTP header name for request ID
	RequestIDHeader = "X-Request-ID"
)

// RequestIDMiddleware generates a unique request ID for each request
// and stores it in the context. If a request ID is provided in the
// X-Request-ID header, it will be used instead of generating a new one.
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if request ID is already provided in header
		requestID := c.GetHeader(RequestIDHeader)

		// If not provided, generate a new UUID
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Store request ID in context
		c.Set(RequestIDKey, requestID)

		// Set response header
		c.Header(RequestIDHeader, requestID)

		// Continue to next handler
		c.Next()
	}
}

// GetRequestID retrieves the request_id from gin.Context
func GetRequestID(c *gin.Context) (string, bool) {
	requestID, exists := c.Get(RequestIDKey)
	if !exists {
		return "", false
	}

	requestIDStr, ok := requestID.(string)
	return requestIDStr, ok
}
