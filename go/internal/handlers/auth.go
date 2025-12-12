package handlers

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

// GoogleCallback handles the callback from Google OAuth
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	oauthConf := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  "http://localhost:8000/auth/google/callback",
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
	code := c.Query("code")
	ctx := context.Background()
	tok, err := oauthConf.Exchange(ctx, code)
	fmt.Println(tok)
	fmt.Println(err)
	// if err != nil {
	// 	return c.JSON(http.StatusInternalServerError, apperror.ErrorWrapperWithCode(err, http.StatusInternalServerError))
	// }

	// s, err := v2.NewService(ctx, option.WithTokenSource(h.oauthConf.TokenSource(ctx, tok)))
	// if err != nil {
	// 	return c.JSON(http.StatusInternalServerError, apperror.ErrorWrapperWithCode(err, http.StatusInternalServerError))
	// }

	// info, err := s.Tokeninfo().AccessToken(tok.AccessToken).Context(ctx).Do()
	// if err != nil {
	// 	return c.JSON(http.StatusInternalServerError, apperror.ErrorWrapperWithCode(err, http.StatusInternalServerError))
	// }
	// u := user.User{}
	// u.Email = info.Email
	// u.GoogleID = info.UserId
	// u.IsVerified = true
	// var url string
	// tokenString, err := uc.uu.LoginWithGoogle(u, uc.cnf)
	// if err != nil {
	// 	url = fmt.Sprintf("%s/not-found", uc.cnf.AppURL)
	// 	return c.Redirect(http.StatusFound, url)
	// }

	// cookie.SetCookie(tokenString, uc.cnf.APIDomain, c, time.Now().Add(24*time.Hour))

	// url = fmt.Sprintf("%s/top", uc.cnf.AppURL)
	c.Redirect(http.StatusFound, "http://localhost:3003/en/talk")
}
