package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/hiroky1983/talk/go/gen/app/appv1connect"
	"github.com/hiroky1983/talk/go/internal/database"
	"github.com/hiroky1983/talk/go/internal/handlers"
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

func main() {
	// Load .env file (try multiple paths)
	err := godotenv.Load()
	if err != nil {
		// Try loading from go/.env if running from project root
		err = godotenv.Load("go/.env")
		if err != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	// Initialize Gorm DB (Foundation)
	db, err := database.NewGormDB()
	if err != nil {
		log.Fatal("Failed to connect to database using Gorm:", err)
	}
	log.Println("Successfully connected to database via Gorm")

	// Run database migrations
	log.Println("Running database migrations...")
	if err := database.RunMigrations(db); err != nil {
		log.Printf("Warning: Failed to run migrations: %v", err)
	}

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
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "Accept-Encoding", "Accept-Language", "Connection", "Host", "User-Agent", "Connect-Protocol-Version", "Connect-Timeout-Ms"},
		ExposeHeaders:    []string{"Content-Length", "Connect-Protocol-Version"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Public routes (no authentication required)
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "AI Language Learning API Server - gRPC streaming enabled!",
		})
	})

	authHandler := handlers.NewAuthHandler()
	router.GET("/auth/google/callback", authHandler.GoogleCallback)

	// WebSocket endpoint
	router.GET("/ws/chat", wsHandler.HandleConnection)

	// Mount Connect RPC handler with wildcard to match all methods
	apiHandler := handlers.NewAPIHandler()
	userPath, userHandler := appv1connect.NewUserServiceHandler(apiHandler.UserHandler)
	router.Any(userPath+"*filepath", wrapConnectHandler(userHandler))

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

func wrapConnectHandler(h http.Handler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}
