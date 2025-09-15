package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/hiroky1983/talk/go/gen/app/appv1connect"
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
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "Accept-Encoding", "Accept-Language", "Connection", "Host", "User-Agent", "Connect-Protocol-Version", "Connect-Timeout-Ms"},
		ExposeHeaders:    []string{"Content-Length", "Connect-Protocol-Version"},
		AllowCredentials: true,
		MaxAge:          12 * time.Hour,
	}))

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

	// Mount Connect RPC handler directly
	router.Any(aiPath, gin.WrapH(aiHandler))

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
