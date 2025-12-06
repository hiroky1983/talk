package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/hiroky1983/talk/go/internal/websocket"
	"github.com/hiroky1983/talk/go/middleware"
)

// ロギングミドルウェア
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		t := time.Now()

		// リクエスト前の処理
		path := c.Request.URL.Path

		// リクエストを処理
		c.Next()

		// リクエスト後の処理
		latency := time.Since(t)
		statusCode := c.Writer.Status()

		// リクエストIDを取得
		requestID, _ := middleware.GetRequestID(c)

		log.Printf("[%s] | %3d | %13v | %s |", requestID, statusCode, latency, path)
	}
}

// wrapConnectHandler wraps a Connect RPC handler to pass user_id from gin.Context to context.Context
func wrapConnectHandler(handler http.Handler) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user_id from gin.Context (set by AuthMiddleware)
		userID, exists := middleware.GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user_id not found in context"})
			return
		}

		// Create new context with user_id
		ctx := context.WithValue(c.Request.Context(), middleware.UserIDKey, userID)
		r := c.Request.WithContext(ctx)

		// Call Connect RPC handler with updated request
		handler.ServeHTTP(c.Writer, r)
	}
}

func main() {
	// Create AI service
	aiService := NewAIConversationService()

	// Create WebSocket handler
	wsHandler := websocket.NewHandler(aiService)

	// Create Gin router
	router := gin.Default()
	router.Use(middleware.RequestIDMiddleware())
	router.Use(Logger())

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3003"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "Accept-Encoding", "Accept-Language", "Connection", "Host", "User-Agent", "Connect-Protocol-Version", "Connect-Timeout-Ms", "X-User-ID"},
		ExposeHeaders:    []string{"Content-Length", "Connect-Protocol-Version"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Apply authentication middleware to all routes except health checks and preflight requests
	router.Use(func(c *gin.Context) {
		// Skip authentication for health check endpoints and CORS preflight requests
		if c.Request.URL.Path == "/" || c.Request.URL.Path == "/health" || c.Request.URL.Path == "/ws/chat" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// Extract user_id from X-User-ID header
		userID := c.GetHeader(middleware.UserIDHeader)

		// Validate that user_id is present
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized: user_id is required",
			})
			c.Abort()
			return
		}

		// Store user_id in context for downstream handlers
		c.Set(middleware.UserIDKey, userID)

		// Continue to next handler
		c.Next()
	})

	// Regular HTTP endpoints
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "AI Language Learning API Server - gRPC streaming enabled!",
		})
	})

	// WebSocket endpoint
	router.GET("/ws/chat", wsHandler.HandleConnection)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "healthy - AI conversation service running",
		})
	})

	// Mount Connect RPC handler with wildcard to match all methods
	// router.Any(aiPath+"*filepath", wrapConnectHandler(aiHandler))

	log.Println("Starting AI Language Learning server on :8000")
	log.Println("WebSocket service available at: /ws/chat")

	// Use h2c for HTTP/2 without TLS (required for streaming)
	server := &http.Server{
		Addr:    ":8000",
		Handler: h2c.NewHandler(router, &http2.Server{}),
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
