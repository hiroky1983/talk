package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	app "github.com/hiroky1983/talk/go/gen/app"
	"github.com/hiroky1983/talk/go/gen/app/appv1connect"
)

// AIConversationService implements the AI conversation service
type AIConversationService struct {
	// In a real implementation, this would connect to the Python service
	// For now, we'll simulate responses
	sessions map[string]bool
}

// NewAIConversationService creates a new AI conversation service instance
func NewAIConversationService() *AIConversationService {
	return &AIConversationService{
		sessions: make(map[string]bool),
	}
}

// StartConversation starts a new conversation session
func (s *AIConversationService) StartConversation(
	ctx context.Context,
	req *connect.Request[app.StartConversationRequest],
) (*connect.Response[app.StartConversationResponse], error) {
	log.Printf("Starting conversation for user %s in language %s", req.Msg.Username, req.Msg.Language)
	
	// Generate a session ID (in real implementation, this would be more sophisticated)
	sessionID := generateSessionID()
	
	// Store session
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
	
	// Remove session
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
	
	// Simulate processing delay
	time.Sleep(500 * time.Millisecond)
	
	var responseText string
	switch req.Msg.Language {
	case "vi":
		responseText = "Xin chào! Tôi là trợ lý AI. Tôi có thể giúp bạn luyện tập tiếng Việt."
	case "ja":
		responseText = "こんにちは！AIアシスタントです。日本語の練習をお手伝いします。"
	default:
		responseText = "Hello! I'm your AI language learning assistant. How can I help you practice today?"
	}
	
	// In a real implementation, this would call the Python service
	// For now, we simulate the response
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
	
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			// Receive message from client
			req, err := stream.Receive()
			if err != nil {
				if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
					return nil
				}
				return err
			}
			
			log.Printf("Received streaming message from user %s", req.Username)
			
			// Simulate processing
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
			
			// Send response
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
	
	// Send initial conversation started event
	event := &app.ConversationEvent{
		Type:      app.ConversationEvent_CONVERSATION_STARTED,
		UserId:    req.Msg.UserId,
		SessionId: generateSessionID(),
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
			// Send conversation ended event
			endEvent := &app.ConversationEvent{
				Type:      app.ConversationEvent_CONVERSATION_ENDED,
				UserId:    req.Msg.UserId,
				SessionId: event.SessionId,
				Timestamp: timestamppb.Now(),
			}
			return stream.Send(endEvent)
			
		case <-ticker.C:
			// Send periodic keepalive (in a real app, this would be actual events)
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

// Add middleware for handling CORS and other concerns
func (s *AIConversationService) withMiddleware() http.Handler {
	path, handler := appv1connect.NewAIConversationServiceHandler(s)
	mux := http.NewServeMux()
	mux.Handle(path, handler)
	return mux
}