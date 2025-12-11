package handlers

import (
	"github.com/hiroky1983/talk/go/gen/app/appv1connect"
)

type APIHandler struct {
	UserHandler appv1connect.UserServiceHandler
}

func NewAPIHandler() *APIHandler {
	return &APIHandler{
		UserHandler: NewUserHandler(),
	}
}
