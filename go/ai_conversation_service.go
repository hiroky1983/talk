package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	ai "github.com/hiroky1983/talk/go/gen/ai"
	app "github.com/hiroky1983/talk/go/gen/app"
)

// AIConversationService implements the AI conversation service
type AIConversationService struct {
	grpcClient ai.AIConversationServiceClient
	grpcConn   *grpc.ClientConn
}

// NewAIConversationService creates a new AI conversation service instance
func NewAIConversationService() *AIConversationService {
	// Connect to Python gRPC service
	host := os.Getenv("AI_SERVICE_HOST")
	if host == "" {
		host = "localhost" // Default for local development
	}
	port := "50051"

	// Try to connect to gRPC server with retry logic
	var conn *grpc.ClientConn
	var err error

	grpcAddr := net.JoinHostPort(host, port)
	log.Printf("Attempting to connect to Python AI service at %s", grpcAddr)

	for i := 0; i < 5; i++ {
		conn, err = grpc.Dial(grpcAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err == nil {
			log.Printf("Successfully connected to gRPC server at %s", grpcAddr)
			break
		}
		log.Printf("Failed to connect to gRPC server at %s (attempt %d/5): %v", grpcAddr, i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Printf("Warning: Could not connect to gRPC server at %s: %v", grpcAddr, err)
	}

	service := &AIConversationService{
		grpcConn: conn,
	}

	if conn != nil {
		service.grpcClient = ai.NewAIConversationServiceClient(conn)
	}

	return service
}

// SendMessage processes a single message and returns a response
func (s *AIConversationService) SendMessage(
	ctx context.Context,
	req *connect.Request[app.SendMessageRequest],
) (*connect.Response[app.SendMessageResponse], error) {
	// Extract user_id from context (set by AuthMiddleware)
	userID, ok := ctx.Value("user_id").(string)
	if !ok || userID == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user_id not found in context"))
	}

	log.Printf("Processing message from user %s (ID: %s) in language %s with character %s", req.Msg.Username, userID, req.Msg.Language, req.Msg.Character)

	if s.grpcClient == nil {
		return nil, connect.NewError(connect.CodeUnavailable, fmt.Errorf("AI service is not available"))
	}

	// Map app request to ai request
	aiReq := &ai.SendMessageRequest{
		UserId:    userID, // Use user_id from context instead of request body
		Username:  req.Msg.Username,
		Language:  req.Msg.Language,
		Character: req.Msg.Character,
		Timestamp: req.Msg.Timestamp,
		Plan:      &ai.SendMessageRequest_PlanType{PlanType: ai.PlanType_PLAN_TYPE_LITE},
	}

	if audioData, ok := req.Msg.Content.(*app.SendMessageRequest_AudioData); ok {
		aiReq.Content = &ai.SendMessageRequest_AudioData{
			AudioData: audioData.AudioData,
		}
	} else if textMsg, ok := req.Msg.Content.(*app.SendMessageRequest_TextMessage); ok {
		aiReq.Content = &ai.SendMessageRequest_TextMessage{
			TextMessage: textMsg.TextMessage,
		}
	}

	// Call Python gRPC service
	grpcResp, err := s.grpcClient.SendMessage(ctx, aiReq)

	if err != nil {
		log.Printf("gRPC call failed: %v", err)
		return nil, err
	}

	// Validate response - check if it has valid audio content
	hasValidContent := false

	// Map ai response back to app response
	appResp := &app.SendMessageResponse{
		ResponseId: grpcResp.ResponseId,
		Language:   grpcResp.Language,
		Timestamp:  grpcResp.Timestamp,
		IsFinal:    grpcResp.IsFinal,
	}

	if grpcResp.Content != nil {
		if audioContent, ok := grpcResp.Content.(*ai.SendMessageResponse_AudioData); ok {
			// Check if audio data is not empty and has reasonable size
			if len(audioContent.AudioData) > 100 {
				hasValidContent = true
				appResp.Content = &app.SendMessageResponse_AudioData{
					AudioData: audioContent.AudioData,
				}
			} else {
				log.Printf("Warning: Audio data is too small (%d bytes), likely invalid", len(audioContent.AudioData))
			}
		} else if textContent, ok := grpcResp.Content.(*ai.SendMessageResponse_TextMessage); ok {
			hasValidContent = true
			appResp.Content = &app.SendMessageResponse_TextMessage{
				TextMessage: textContent.TextMessage,
			}
		}
	}

	if !hasValidContent {
		log.Printf("Warning: Response has no valid audio content, returning error")
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("AI service returned invalid or empty response"))
	}

	return connect.NewResponse(appResp), nil
}

// Cleanup connection on shutdown
func (s *AIConversationService) Close() {
	if s.grpcConn != nil {
		s.grpcConn.Close()
	}
}
