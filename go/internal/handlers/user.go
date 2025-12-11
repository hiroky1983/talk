package handlers

import (
	"context"
	"log"

	"connectrpc.com/connect"
	app "github.com/hiroky1983/talk/go/gen/app"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) CreateUser(ctx context.Context, req *connect.Request[app.User]) (*connect.Response[app.User], error) {
	log.Printf("CreateUser called: %v", req.Msg)
	// TODO: Implement user creation logic
	return connect.NewResponse(req.Msg), nil
}

func (h *UserHandler) GetUser(ctx context.Context, req *connect.Request[app.GetUserRequest]) (*connect.Response[app.User], error) {
	log.Printf("GetUser called: %v", req.Msg)
	// TODO: Implement user retrieval logic
	return connect.NewResponse(&app.User{
		UserId: req.Msg.UserId,
	}), nil
}
