package main

import (
	"context"
	"log"
	"net"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/timestamppb"

	app "github.com/hiroky1983/talk/go/gen/app"
)

// AIConversationService implements the AI conversation service
type AIConversationService struct {
	grpcClient app.AIConversationServiceClient
	grpcConn   *grpc.ClientConn
	sessions   map[string]bool
}

// NewAIConversationService creates a new AI conversation service instance
func NewAIConversationService() *AIConversationService {
	// Connect to Python gRPC service
	host := "ai-service" // Docker service name
	port := "50051"

	// Try to connect to gRPC server with retry logic
	var conn *grpc.ClientConn
	var err error

	for i := 0; i < 5; i++ {
		conn, err = grpc.Dial(net.JoinHostPort(host, port), grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err == nil {
			break
		}
		log.Printf("Failed to connect to gRPC server (attempt %d/5): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Printf("Warning: Could not connect to gRPC server: %v", err)
		// Continue without gRPC connection - will simulate responses
	}

	service := &AIConversationService{
		grpcConn: conn,
		sessions: make(map[string]bool),
	}

	if conn != nil {
		service.grpcClient = app.NewAIConversationServiceClient(conn)
	}

	return service
}

// StartConversation starts a new conversation session
func (s *AIConversationService) StartConversation(
	ctx context.Context,
	req *connect.Request[app.StartConversationRequest],
) (*connect.Response[app.StartConversationResponse], error) {
	log.Printf("Starting conversation for user %s in language %s with character %s", req.Msg.Username, req.Msg.Language, req.Msg.Character)

	if s.grpcClient != nil {
		// Call Python gRPC service
		grpcResp, err := s.grpcClient.StartConversation(ctx, &app.StartConversationRequest{
			UserId:    req.Msg.UserId,
			Username:  req.Msg.Username,
			Language:  req.Msg.Language,
			Character: req.Msg.Character,
		})

		if err != nil {
			log.Printf("gRPC call failed: %v", err)
			return nil, err
		}

		// Store session
		if grpcResp.Success {
			s.sessions[grpcResp.SessionId] = true
		}

		return connect.NewResponse(grpcResp), nil
	}

	// Fallback simulation if gRPC not available
	sessionID := generateSessionID()
	s.sessions[sessionID] = true

	resp := &app.StartConversationResponse{
		SessionId:    sessionID,
		Success:      true,
		ErrorMessage: "",
	}

	return connect.NewResponse(resp), nil
}

// EndConversation ends a conversation session
func (s *AIConversationService) EndConversation(
	ctx context.Context,
	req *connect.Request[app.EndConversationRequest],
) (*connect.Response[app.EndConversationResponse], error) {
	log.Printf("Ending conversation session %s", req.Msg.SessionId)

	if s.grpcClient != nil {
		// Call Python gRPC service
		grpcResp, err := s.grpcClient.EndConversation(ctx, &app.EndConversationRequest{
			SessionId: req.Msg.SessionId,
			UserId:    req.Msg.UserId,
		})

		if err != nil {
			log.Printf("gRPC call failed: %v", err)
			return nil, err
		}

		// Remove session locally if successful
		if grpcResp.Success {
			delete(s.sessions, req.Msg.SessionId)
		}

		return connect.NewResponse(grpcResp), nil
	}

	// Fallback simulation
	delete(s.sessions, req.Msg.SessionId)

	resp := &app.EndConversationResponse{
		Success:      true,
		ErrorMessage: "",
	}

	return connect.NewResponse(resp), nil
}

// SendMessage processes a single message and returns a response
func (s *AIConversationService) SendMessage(
	ctx context.Context,
	req *connect.Request[app.AIConversationRequest],
) (*connect.Response[app.AIConversationResponse], error) {
	log.Printf("Processing message from user %s in language %s with character %s", req.Msg.Username, req.Msg.Language, req.Msg.Character)

	if s.grpcClient != nil {
		// Call Python gRPC service
		grpcResp, err := s.grpcClient.SendMessage(ctx, &app.AIConversationRequest{
			UserId:    req.Msg.UserId,
			Username:  req.Msg.Username,
			Language:  req.Msg.Language,
			Character: req.Msg.Character,
			Content:   req.Msg.Content,
			Timestamp: req.Msg.Timestamp,
		})

		if err != nil {
			log.Printf("gRPC call failed: %v", err)
			return nil, err
		}

		return connect.NewResponse(grpcResp), nil
	}

	// Fallback simulation with character-specific responses
	var responseText string
	character := req.Msg.Character
	if character == "" {
		character = "friend"
	}

	switch req.Msg.Language {
	case "vi":
		switch character {
		case "parent":
			responseText = "Con có khỏe không? Mẹ sẵn sàng lắng nghe con chia sẻ."
		case "sister":
			responseText = "Anh/chị làm gì đấy? Em muốn nghe chuyện nè!"
		default: // friend
			responseText = "Chào bạn! Mình là bạn AI. Chúng ta trò chuyện nhé!"
		}
	case "ja":
		switch character {
		case "parent":
			responseText = "元気？お母さんはいつでも聞いてるからね。"
		case "sister":
			responseText = "何してるの？お姉ちゃんと話そうよー！"
		default: // friend
			responseText = "やあ！友達として日本語の練習を手伝うよ。"
		}
	default:
		responseText = "Hello! I'm your AI language learning assistant. How can I help you practice today?"
	}

	resp := &app.AIConversationResponse{
		ResponseId: generateResponseID(),
		Language:   req.Msg.Language,
		Timestamp:  timestamppb.Now(),
		IsFinal:    true,
		Content: &app.AIConversationResponse_TextMessage{
			TextMessage: responseText,
		},
	}

	return connect.NewResponse(resp), nil
}

// Helper functions
func generateSessionID() string {
	return "session_" + time.Now().Format("20060102150405")
}

func generateResponseID() string {
	return "response_" + time.Now().Format("20060102150405.000")
}

// Cleanup connection on shutdown
func (s *AIConversationService) Close() {
	if s.grpcConn != nil {
		s.grpcConn.Close()
	}
}
