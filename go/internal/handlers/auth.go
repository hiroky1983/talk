package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

// GoogleCallback handles the callback from Google OAuth
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	// code := c.Query("code")
	// state := c.Query("state")

	// TODO: If needed, redirect to frontend
	c.Redirect(http.StatusFound, "http://localhost:3003/en/talk")
}
