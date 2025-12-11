package websocket

import (
	"context"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	ai "github.com/hiroky1983/talk/go/gen/ai"
	"github.com/hiroky1983/talk/go/middleware"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev
	},
}

type AIClientProvider interface {
	GetGRPCClient() ai.AIConversationServiceClient
}

type Handler struct {
	aiProvider AIClientProvider
}

func NewHandler(provider AIClientProvider) *Handler {
	return &Handler{
		aiProvider: provider,
	}
}

// HandleConnection upgrades the HTTP connection to a WebSocket connection
// and handles the conversation loop.
func (h *Handler) HandleConnection(c *gin.Context) {
	// Get request ID from context
	requestID, _ := middleware.GetRequestID(c)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[%s] Failed to upgrade to websocket: %v", requestID, err)
		return
	}
	defer conn.Close()

	client := h.aiProvider.GetGRPCClient()
	if client == nil {
		log.Printf("[%s] AI Service client is not available", requestID)
		return
	}

	// Create a context for the stream
	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	// Start bi-directional gRPC stream
	stream, err := client.StreamChat(ctx)
	if err != nil {
		log.Printf("[%s] Failed to start StreamChat: %v", requestID, err)
		return
	}

	log.Printf("[%s] WebSocket connection established and gRPC stream started", requestID)

	// Helper to send setup message (Temporary hardcoded until FE sends it)
	// Ideally FE should send a JSON setup message first.
	// For now, we assume defaults if we just start receiving bytes.
	// But let's look at what we can do. We'll send a dummy setup first.
	// Note: In a real app, strict protocol is needed.
	// We'll use values from query params or assume defaults.
	// Note: In a real app, strict protocol is needed.
	// We'll use values from query params or assume defaults.
	if err := stream.Send(&ai.ChatRequest{
		Content: &ai.ChatRequest_Setup{
			Setup: &ai.ChatConfiguration{
				UserId:    "user-123", // TODO: Get from Auth
				Username:  "User",
				Language:  "ja", // Default
				Character: "friend",
				Plan:      ai.Plan_PLAN_LITE,
			},
		},
	}); err != nil {
		log.Printf("[%s] Failed to send setup message: %v", requestID, err)
		return
	}

	// Channel to signal completion or error
	done := make(chan struct{})

	// Goroutine: Receive from gRPC (AI) -> Send to WebSocket (Browser)
	go func() {
		defer close(done)
		for {
			resp, err := stream.Recv()
			if err == io.EOF {
				log.Printf("[%s] AI stream finished", requestID)
				return
			}
			if err != nil {
				if st, ok := status.FromError(err); ok && st.Code() == codes.Canceled {
					log.Printf("[%s] AI stream context canceled (client disconnected)", requestID)
					return
				}
				log.Printf("[%s] Error receiving from AI stream: %v", requestID, err)
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Handle different response content types
			if audio := resp.GetAudioChunk(); len(audio) > 0 {
				// Send audio as binary message
				if err := conn.WriteMessage(websocket.BinaryMessage, audio); err != nil {
					log.Printf("[%s] Error sending audio to WS: %v", requestID, err)
					return
				}
			} else if text := resp.GetTextMessage(); text != "" {
				// Send text as text message
				if err := conn.WriteMessage(websocket.TextMessage, []byte(text)); err != nil {
					log.Printf("[%s] Error sending text to WS: %v", requestID, err)
					return
				}
			}
		}
	}()

	// Main Loop: Receive from WebSocket (Browser) -> Send to gRPC (AI)
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[%s] WebSocket error: %v", requestID, err)
			} else {
				log.Printf("[%s] WebSocket closed", requestID)
			}
			break
		}

		// Check context status
		select {
		case <-done:
			return
		default:
		}

		if messageType == websocket.BinaryMessage {
			// Assume binary message is audio chunk
			if err := stream.Send(&ai.ChatRequest{
				Content: &ai.ChatRequest_AudioChunk{
					AudioChunk: p,
				},
			}); err != nil {
				log.Printf("[%s] Error sending audio chunk to AI: %v", requestID, err)
				break
			}
		} else if messageType == websocket.TextMessage {
			// Maybe handle control messages or text input
			text := string(p)
			if text == "EOS" {
				// End of Speech signal
				if err := stream.Send(&ai.ChatRequest{
					Content: &ai.ChatRequest_EndOfInput{
						EndOfInput: true,
					},
				}); err != nil {
					log.Printf("[%s] Error sending EOS to AI: %v", requestID, err)
					break
				}
			} else {
				log.Printf("[%s] Received text: %s", requestID, text)
			}
		}
	}
}
