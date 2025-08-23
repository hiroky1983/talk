package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	app "github.com/hiroky1983/talk/go/gen/app"
	"github.com/hiroky1983/talk/go/gen/app/appv1connect"
)

// FastAPI request/response types
type StartConversationRequest struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Language string `json:"language"`
}

type StartConversationResponse struct {
	SessionID    string `json:"session_id"`
	Success      bool   `json:"success"`
	ErrorMessage string `json:"error_message"`
}

type EndConversationRequest struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
}

type EndConversationResponse struct {
	Success      bool   `json:"success"`
	ErrorMessage string `json:"error_message"`
}

type SendMessageRequest struct {
	UserID       string `json:"user_id"`
	Username     string `json:"username"`
	Language     string `json:"language"`
	TextMessage  string `json:"text_message,omitempty"`
	AudioData    []byte `json:"audio_data,omitempty"`
	SessionID    string `json:"session_id,omitempty"`
}

type SendMessageResponse struct {
	ResponseID  string `json:"response_id"`
	TextMessage string `json:"text_message,omitempty"`
	AudioData   string `json:"audio_data,omitempty"` // base64 encoded
	Language    string `json:"language"`
	Timestamp   string `json:"timestamp"` // ISO format string
	IsFinal     bool   `json:"is_final"`
}

// AIConversationService implements the AI conversation service
type AIConversationService struct {
	fastapiURL string
	httpClient *http.Client
	sessions   map[string]bool
}

// NewAIConversationService creates a new AI conversation service instance
func NewAIConversationService() *AIConversationService {
	fastapiURL := os.Getenv("AI_SERVICE_HOST")
	if fastapiURL == "" {
		fastapiURL = "localhost"
	}
	port := os.Getenv("AI_SERVICE_PORT")
	if port == "" {
		port = "8001"
	}
	fastapiURL = fmt.Sprintf("http://%s:%s", fastapiURL, port)
	
	return &AIConversationService{
		fastapiURL: fastapiURL,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		sessions:   make(map[string]bool),
	}
}

// StartConversation starts a new conversation session
func (s *AIConversationService) StartConversation(
	ctx context.Context,
	req *connect.Request[app.StartConversationRequest],
) (*connect.Response[app.StartConversationResponse], error) {
	log.Printf("Starting conversation for user %s in language %s", req.Msg.Username, req.Msg.Language)
	
	// Call FastAPI service
	fastapiReq := StartConversationRequest{
		UserID:   req.Msg.UserId,
		Username: req.Msg.Username,
		Language: req.Msg.Language,
	}
	
	jsonData, err := json.Marshal(fastapiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.fastapiURL+"/api/v1/conversation/start", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	httpResp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call FastAPI: %w", err)
	}
	defer httpResp.Body.Close()
	
	body, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	var fastapiResp StartConversationResponse
	if err := json.Unmarshal(body, &fastapiResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	// Store session locally if successful
	if fastapiResp.Success {
		s.sessions[fastapiResp.SessionID] = true
	}
	
	resp := &app.StartConversationResponse{
		SessionId:    fastapiResp.SessionID,
		Success:      fastapiResp.Success,
		ErrorMessage: fastapiResp.ErrorMessage,
	}
	
	return connect.NewResponse(resp), nil
}

// EndConversation ends a conversation session
func (s *AIConversationService) EndConversation(
	ctx context.Context,
	req *connect.Request[app.EndConversationRequest],
) (*connect.Response[app.EndConversationResponse], error) {
	log.Printf("Ending conversation session %s", req.Msg.SessionId)
	
	// Call FastAPI service
	fastapiReq := EndConversationRequest{
		SessionID: req.Msg.SessionId,
		UserID:    req.Msg.UserId,
	}
	
	jsonData, err := json.Marshal(fastapiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.fastapiURL+"/api/v1/conversation/end", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	httpResp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call FastAPI: %w", err)
	}
	defer httpResp.Body.Close()
	
	body, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	var fastapiResp EndConversationResponse
	if err := json.Unmarshal(body, &fastapiResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	// Remove session locally if successful
	if fastapiResp.Success {
		delete(s.sessions, req.Msg.SessionId)
	}
	
	resp := &app.EndConversationResponse{
		Success:      fastapiResp.Success,
		ErrorMessage: fastapiResp.ErrorMessage,
	}
	
	return connect.NewResponse(resp), nil
}

// SendMessage processes a single message and returns a response
func (s *AIConversationService) SendMessage(
	ctx context.Context,
	req *connect.Request[app.AIConversationRequest],
) (*connect.Response[app.AIConversationResponse], error) {
	log.Printf("Processing message from user %s in language %s", req.Msg.Username, req.Msg.Language)
	
	// Prepare FastAPI request
	fastapiReq := SendMessageRequest{
		UserID:   req.Msg.UserId,
		Username: req.Msg.Username,
		Language: req.Msg.Language,
	}
	
	// Handle different content types
	switch content := req.Msg.Content.(type) {
	case *app.AIConversationRequest_TextMessage:
		fastapiReq.TextMessage = content.TextMessage
	case *app.AIConversationRequest_AudioData:
		fastapiReq.AudioData = content.AudioData
	}
	
	jsonData, err := json.Marshal(fastapiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.fastapiURL+"/api/v1/conversation/message", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	httpResp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call FastAPI: %w", err)
	}
	defer httpResp.Body.Close()
	
	body, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	var fastapiResp SendMessageResponse
	if err := json.Unmarshal(body, &fastapiResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	// Parse timestamp string
	timestamp, err := time.Parse(time.RFC3339, fastapiResp.Timestamp)
	if err != nil {
		// Fallback to current time if parsing fails
		timestamp = time.Now()
	}
	
	// Convert FastAPI response to protobuf response
	resp := &app.AIConversationResponse{
		ResponseId: fastapiResp.ResponseID,
		Language:   fastapiResp.Language,
		Timestamp:  timestamppb.New(timestamp),
		IsFinal:    fastapiResp.IsFinal,
	}
	
	// Set content based on response type
	if fastapiResp.TextMessage != "" {
		resp.Content = &app.AIConversationResponse_TextMessage{
			TextMessage: fastapiResp.TextMessage,
		}
	} else if fastapiResp.AudioData != "" {
		// AudioData is base64 encoded in FastAPI response
		// For now, we'll just handle text responses
		resp.Content = &app.AIConversationResponse_TextMessage{
			TextMessage: "Audio response received",
		}
	}
	
	return connect.NewResponse(resp), nil
}

// StreamConversation handles bidirectional streaming conversation
// Note: With FastAPI backend, this simulates streaming by calling the REST API for each message
func (s *AIConversationService) StreamConversation(
	ctx context.Context,
	stream *connect.BidiStream[app.AIConversationRequest, app.AIConversationResponse],
) error {
	log.Println("Starting streaming conversation (using FastAPI backend)")
	
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
			
			// Use the SendMessage logic to call FastAPI
			connectReq := connect.NewRequest(req)
			connectResp, err := s.SendMessage(ctx, connectReq)
			if err != nil {
				return err
			}
			
			// Forward the response to the stream
			if err := stream.Send(connectResp.Msg); err != nil {
				return err
			}
		}
	}
}

// StreamConversationEvents handles server-side streaming of conversation events
// Note: With FastAPI backend, this provides basic event simulation
func (s *AIConversationService) StreamConversationEvents(
	ctx context.Context,
	req *connect.Request[app.StartConversationRequest],
	stream *connect.ServerStream[app.ConversationEvent],
) error {
	log.Printf("Starting conversation event stream for user %s (using FastAPI backend)", req.Msg.Username)
	
	// First, start a conversation via FastAPI
	startReq := connect.NewRequest(&app.StartConversationRequest{
		UserId:   req.Msg.UserId,
		Username: req.Msg.Username,
		Language: req.Msg.Language,
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
			// End conversation via FastAPI
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