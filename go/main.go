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

	"github.com/hiroky1983/talk/go/gen/app/appv1connect"
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
		log.Printf("| %3d | %13v | %s |", statusCode, latency, path)
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

	// Create Connect RPC handlers
	aiPath, aiHandler := appv1connect.NewAIConversationServiceHandler(aiService)

	// Create Gin router
	router := gin.Default()
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
		if c.Request.URL.Path == "/" || c.Request.URL.Path == "/health" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}
		// Apply authentication middleware for all other routes
		middleware.AuthMiddleware()(c)
	})

	// Regular HTTP endpoints
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "AI Language Learning API Server - gRPC streaming enabled!",
		})
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "healthy - AI conversation service running",
		})
	})

	// Mount Connect RPC handler with wildcard to match all methods
	router.Any(aiPath+"*filepath", wrapConnectHandler(aiHandler))

	log.Println("Starting AI Language Learning server on :8000")
	log.Println("Connect RPC service available at:", aiPath)
	log.Println("AI Conversation service endpoints:")
	log.Printf("  - %s/StartConversation", aiPath)
	log.Printf("  - %s/EndConversation", aiPath)
	log.Printf("  - %s/SendMessage", aiPath)
	log.Printf("  - %s/StreamConversation", aiPath)
	log.Printf("  - %s/StreamConversationEvents", aiPath)

	// Use h2c for HTTP/2 without TLS (required for streaming)
	server := &http.Server{
		Addr:    ":8000",
		Handler: h2c.NewHandler(router, &http2.Server{}),
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
