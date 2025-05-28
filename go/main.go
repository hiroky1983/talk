package main

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
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
	router := gin.Default()

	// グローバルミドルウェアを追加
	router.Use(Logger())

	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "healthy - delve + ホットリロード動作中！",
		})
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "healthy - delve + ホットリロード動作中！",
		})
	})
	router.Run(":8000")
}
