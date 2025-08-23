package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	appv1 "github.com/hiroky1983/talk/go/gen/app"
)

type ChatService struct {
	// rooms stores active chat rooms and their subscribers
	rooms map[string]*ChatRoom
	mu    sync.RWMutex
}

type ChatRoom struct {
	ID          string
	subscribers map[string]chan *appv1.ChatEvent
	mu          sync.RWMutex
}

func NewChatService() *ChatService {
	return &ChatService{
		rooms: make(map[string]*ChatRoom),
	}
}

func (s *ChatService) getOrCreateRoom(roomID string) *ChatRoom {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, exists := s.rooms[roomID]
	if !exists {
		room = &ChatRoom{
			ID:          roomID,
			subscribers: make(map[string]chan *appv1.ChatEvent),
		}
		s.rooms[roomID] = room
	}
	return room
}

func (s *ChatService) JoinChat(
	ctx context.Context,
	req *connect.Request[appv1.JoinChatRequest],
) (*connect.Response[appv1.JoinChatResponse], error) {
	room := s.getOrCreateRoom(req.Msg.RoomId)

	// Broadcast user joined event
	joinEvent := &appv1.ChatEvent{
		Type:      appv1.ChatEventType_USER_JOINED,
		UserId:    req.Msg.UserId,
		Username:  req.Msg.Username,
		Timestamp: timestamppb.Now(),
	}

	room.broadcast(joinEvent, req.Msg.UserId)

	return connect.NewResponse(&appv1.JoinChatResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully joined room %s", req.Msg.RoomId),
	}), nil
}

func (s *ChatService) SendMessage(
	ctx context.Context,
	req *connect.Request[appv1.SendMessageRequest],
) (*connect.Response[appv1.SendMessageResponse], error) {
	room := s.getOrCreateRoom(req.Msg.RoomId)

	messageID := fmt.Sprintf("msg_%d", time.Now().UnixNano())
	
	// Create message event
	messageEvent := &appv1.ChatEvent{
		Type: appv1.ChatEventType_MESSAGE,
		Message: &appv1.ChatMessage{
			Id:        messageID,
			UserId:    req.Msg.UserId,
			Username:  req.Msg.Username,
			Content:   req.Msg.Content,
			CreatedAt: timestamppb.Now(),
		},
		Timestamp: timestamppb.Now(),
	}

	// Broadcast to all subscribers in the room
	room.broadcast(messageEvent, "")

	return connect.NewResponse(&appv1.SendMessageResponse{
		Success:   true,
		MessageId: messageID,
	}), nil
}

func (s *ChatService) StreamChat(
	ctx context.Context,
	req *connect.Request[appv1.StreamChatRequest],
	stream *connect.ServerStream[appv1.ChatEvent],
) error {
	room := s.getOrCreateRoom(req.Msg.RoomId)
	
	// Create a channel for this subscriber
	eventChan := make(chan *appv1.ChatEvent, 100)
	
	// Add subscriber to room
	room.addSubscriber(req.Msg.UserId, eventChan)
	defer room.removeSubscriber(req.Msg.UserId)

	// Send welcome message
	welcomeEvent := &appv1.ChatEvent{
		Type: appv1.ChatEventType_MESSAGE,
		Message: &appv1.ChatMessage{
			Id:        fmt.Sprintf("welcome_%d", time.Now().UnixNano()),
			UserId:    "system",
			Username:  "System",
			Content:   fmt.Sprintf("Welcome to room %s!", req.Msg.RoomId),
			CreatedAt: timestamppb.Now(),
		},
		Timestamp: timestamppb.Now(),
	}
	
	if err := stream.Send(welcomeEvent); err != nil {
		return err
	}

	// Listen for events and send to client
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case event := <-eventChan:
			if err := stream.Send(event); err != nil {
				return err
			}
		}
	}
}

func (s *ChatService) BiStreamChat(
	ctx context.Context,
	stream *connect.BidiStream[appv1.SendMessageRequest, appv1.ChatEvent],
) error {
	// This implementation would handle bidirectional streaming
	// For now, we'll keep it simple and just echo messages
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			msg, err := stream.Receive()
			if err != nil {
				return err
			}

			// Create response event
			event := &appv1.ChatEvent{
				Type: appv1.ChatEventType_MESSAGE,
				Message: &appv1.ChatMessage{
					Id:        fmt.Sprintf("bimsg_%d", time.Now().UnixNano()),
					UserId:    msg.UserId,
					Username:  msg.Username,
					Content:   msg.Content,
					CreatedAt: timestamppb.Now(),
				},
				Timestamp: timestamppb.Now(),
			}

			if err := stream.Send(event); err != nil {
				return err
			}
		}
	}
}

// ChatRoom methods
func (r *ChatRoom) addSubscriber(userID string, eventChan chan *appv1.ChatEvent) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.subscribers[userID] = eventChan
}

func (r *ChatRoom) removeSubscriber(userID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if eventChan, exists := r.subscribers[userID]; exists {
		close(eventChan)
		delete(r.subscribers, userID)
	}

	// Broadcast user left event
	leftEvent := &appv1.ChatEvent{
		Type:      appv1.ChatEventType_USER_LEFT,
		UserId:    userID,
		Timestamp: timestamppb.Now(),
	}
	r.broadcastUnsafe(leftEvent, userID)
}

func (r *ChatRoom) broadcast(event *appv1.ChatEvent, excludeUserID string) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	r.broadcastUnsafe(event, excludeUserID)
}

func (r *ChatRoom) broadcastUnsafe(event *appv1.ChatEvent, excludeUserID string) {
	for userID, eventChan := range r.subscribers {
		if userID != excludeUserID {
			select {
			case eventChan <- event:
			default:
				// Channel is full, skip this subscriber
			}
		}
	}
}