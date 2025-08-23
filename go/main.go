package main

import (
	"log"
	"net/http"
	"time"

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
	// Create chat service
	chatService := NewChatService()
	
	// Create Connect RPC handlers
	chatPath, chatHandler := appv1connect.NewChatServiceHandler(chatService)

	// Create HTTP mux for Connect RPC
	mux := http.NewServeMux()
	mux.Handle(chatPath, chatHandler)

	// Create Gin router for regular HTTP endpoints
	router := gin.Default()
	router.Use(Logger())

	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Chat API Server - gRPC streaming enabled!",
		})
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "healthy - chat service running",
		})
	})

	// Mount Connect RPC handlers at /connect/*
	router.Any("/connect/*proxyPath", func(c *gin.Context) {
		// Strip the /connect prefix and proxy to the Connect handler
		c.Request.URL.Path = c.Param("proxyPath")
		mux.ServeHTTP(c.Writer, c.Request)
	})

	log.Println("Starting server on :8000")
	log.Println("Connect RPC services available at /connect/*")
	log.Println("Chat service endpoints:")
	log.Println("  - /connect/app.v1.ChatService/JoinChat")
	log.Println("  - /connect/app.v1.ChatService/SendMessage")
	log.Println("  - /connect/app.v1.ChatService/StreamChat")
	log.Println("  - /connect/app.v1.ChatService/BiStreamChat")

	// Use h2c for HTTP/2 without TLS (required for streaming)
	server := &http.Server{
		Addr:    ":8000",
		Handler: h2c.NewHandler(router, &http2.Server{}),
	}
	
	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
