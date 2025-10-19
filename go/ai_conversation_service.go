package main

import (
	"context"
	"errors"
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
	}

	if conn != nil {
		service.grpcClient = app.NewAIConversationServiceClient(conn)
	}

	return service
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

// StreamConversation handles bidirectional streaming conversation
func (s *AIConversationService) StreamConversation(
	ctx context.Context,
	stream *connect.BidiStream[app.AIConversationRequest, app.AIConversationResponse],
) error {
	log.Println("Starting streaming conversation")

	if s.grpcClient != nil {
		// Use gRPC streaming
		grpcStream, err := s.grpcClient.StreamConversation(ctx)
		if err != nil {
			log.Printf("Failed to start gRPC stream: %v", err)
			return err
		}

		// Forward messages between Connect stream and gRPC stream
		go func() {
			for {
				req, err := stream.Receive()
				if err != nil {
					grpcStream.CloseSend()
					return
				}

				grpcReq := &app.AIConversationRequest{
					UserId:    req.UserId,
					Username:  req.Username,
					Language:  req.Language,
					Character: req.Character,
					Content:   req.Content,
					Timestamp: req.Timestamp,
				}

				if err := grpcStream.Send(grpcReq); err != nil {
					log.Printf("Failed to send to gRPC stream: %v", err)
					return
				}
			}
		}()

		for {
			grpcResp, err := grpcStream.Recv()
			if err != nil {
				return err
			}

			if err := stream.Send(grpcResp); err != nil {
				return err
			}
		}
	}

	// Fallback simulation
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			req, err := stream.Receive()
			if err != nil {
				if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
					return nil
				}
				return err
			}

			log.Printf("Received streaming message from user %s", req.Username)

			time.Sleep(500 * time.Millisecond)

			character := req.Character
			if character == "" {
				character = "friend"
			}

			var responseText string
			switch req.Language {
			case "vi":
				switch character {
				case "parent":
					responseText = "Mẹ nghe rồi con. Hãy kể cho mẹ nghe thêm nhé!"
				case "sister":
					responseText = "Em nghe thấy rồi! Kể tiếp đi anh/chị!"
				default:
					responseText = "Tôi đã nghe thấy tin nhắn của bạn. Hãy tiếp tục trò chuyện!"
				}
			case "ja":
				switch character {
				case "parent":
					responseText = "お母さんは聞いてるよ。もっと話してね。"
				case "sister":
					responseText = "聞いた聞いた！続きを教えて！"
				default:
					responseText = "メッセージを受け取ったよ。続けて話そう！"
				}
			default:
				responseText = "I received your message. Let's continue practicing!"
			}

			resp := &app.AIConversationResponse{
				ResponseId: generateResponseID(),
				Language:   req.Language,
				Timestamp:  timestamppb.Now(),
				IsFinal:    true,
				Content: &app.AIConversationResponse_TextMessage{
					TextMessage: responseText,
				},
			}

			if err := stream.Send(resp); err != nil {
				return err
			}
		}
	}
}

// Helper functions
func generateResponseID() string {
	return "response_" + time.Now().Format("20060102150405.000")
}

// Cleanup connection on shutdown
func (s *AIConversationService) Close() {
	if s.grpcConn != nil {
		s.grpcConn.Close()
	}
}
