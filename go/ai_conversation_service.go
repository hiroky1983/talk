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
	log.Printf("Starting conversation for user %s in language %s", req.Msg.Username, req.Msg.Language)
	
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
	log.Printf("Processing message from user %s in language %s", req.Msg.Username, req.Msg.Language)
	
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
	
	// Fallback simulation
	var responseText string
	switch req.Msg.Language {
	case "vi":
		responseText = "Xin chào! Tôi là trợ lý AI. Tôi có thể giúp bạn luyện tập tiếng Việt."
	case "ja":
		responseText = "こんにちは！AIアシスタントです。日本語の練習をお手伝いします。"
	default:
		responseText = "Hello! I'm your AI language learning assistant. How can I help you practice today?"
	}
	
	resp := &app.AIConversationResponse{
		ResponseId:  generateResponseID(),
		Language:    req.Msg.Language,
		Timestamp:   timestamppb.Now(),
		IsFinal:     true,
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
			
			var responseText string
			switch req.Language {
			case "vi":
				responseText = "Tôi đã nghe thấy tin nhắn của bạn. Hãy tiếp tục luyện tập!"
			case "ja":
				responseText = "メッセージを受け取りました。練習を続けましょう！"
			default:
				responseText = "I received your message. Let's continue practicing!"
			}
			
			resp := &app.AIConversationResponse{
				ResponseId:  generateResponseID(),
				Language:    req.Language,
				Timestamp:   timestamppb.Now(),
				IsFinal:     true,
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

// StreamConversationEvents handles server-side streaming of conversation events
func (s *AIConversationService) StreamConversationEvents(
	ctx context.Context,
	req *connect.Request[app.StartConversationRequest],
	stream *connect.ServerStream[app.ConversationEvent],
) error {
	log.Printf("Starting conversation event stream for user %s", req.Msg.Username)
	
	// Start a conversation first
	startReq := connect.NewRequest(&app.StartConversationRequest{
		UserId:    req.Msg.UserId,
		Username:  req.Msg.Username,
		Language:  req.Msg.Language,
		Character: req.Msg.Character,
	})
	
	startResp, err := s.StartConversation(ctx, startReq)
	if err != nil {
		return err
	}
	
	// Send initial conversation started event
	event := &app.ConversationEvent{
		Type:      app.ConversationEvent_CONVERSATION_STARTED,
		UserId:    req.Msg.UserId,
		SessionId: startResp.Msg.SessionId,
		Timestamp: timestamppb.Now(),
	}
	
	if err := stream.Send(event); err != nil {
		return err
	}
	
	// Keep the stream alive and send periodic events
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			// End conversation
			endReq := connect.NewRequest(&app.EndConversationRequest{
				SessionId: startResp.Msg.SessionId,
				UserId:    req.Msg.UserId,
			})
			s.EndConversation(ctx, endReq)
			
			// Send conversation ended event
			endEvent := &app.ConversationEvent{
				Type:      app.ConversationEvent_CONVERSATION_ENDED,
				UserId:    req.Msg.UserId,
				SessionId: startResp.Msg.SessionId,
				Timestamp: timestamppb.Now(),
			}
			return stream.Send(endEvent)
			
		case <-ticker.C:
			log.Println("Sending conversation keepalive event")
		}
	}
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