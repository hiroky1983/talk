package main

import (
	"log"
	"net"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	ai "github.com/hiroky1983/talk/go/gen/ai"
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

// GetGRPCClient returns the underlying gRPC client
func (s *AIConversationService) GetGRPCClient() ai.AIConversationServiceClient {
	return s.grpcClient
}

// SendMessage is deprecated/removed in favor of WebSocket + StreamChat
// Keeping empty method stub if interface requires it, otherwise removing.
// Since we removed it from app proto, we don't need to implement it for Connect handler anymore unless we kept the handler.
// But we modified app proto to remove SendMessage RPC, so we should delete this implementation.

// Cleanup connection on shutdown
func (s *AIConversationService) Close() {
	if s.grpcConn != nil {
		s.grpcConn.Close()
	}
}
