"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  ChatEvent,
  ChatEventType,
  StreamChatRequestSchema,
  JoinChatRequestSchema,
  SendMessageRequestSchema,
} from "../gen/app/chat_pb";
import { ChatService } from "../gen/app/chat_service_pb";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: "message" | "system";
}

interface ChatRoomProps {
  roomId: string;
  userId: string;
  username: string;
}

export default function ChatRoom({ roomId, userId, username }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create Connect client
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8000/connect",
  });
  const client = createClient(ChatService, transport);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToChat = async () => {
    try {
      setError(null);

      // Join chat room first
      await client.joinChat(create(JoinChatRequestSchema, {
        roomId,
        userId,
        username,
      }));

      // Start streaming chat events
      abortControllerRef.current = new AbortController();

      const streamRequest = create(StreamChatRequestSchema, {
        roomId,
        userId,
      });

      const stream = client.streamChat(streamRequest, {
        signal: abortControllerRef.current.signal,
      });

      setIsConnected(true);

      for await (const event of stream) {
        handleChatEvent(event);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(`Connection error: ${err.message}`);
        setIsConnected(false);
      }
    }
  };

  const handleChatEvent = (event: ChatEvent) => {
    switch (event.type) {
      case ChatEventType.MESSAGE:
        if (event.message) {
          setMessages((prev) => [
            ...prev,
            {
              id: event.message!.id,
              userId: event.message!.userId,
              username: event.message!.username,
              content: event.message!.content,
              timestamp: event.message!.createdAt ? new Date(Number(event.message!.createdAt.seconds) * 1000 + Math.floor(event.message!.createdAt.nanos / 1000000)) : new Date(),
              type: event.message!.userId === "system" ? "system" : "message",
            },
          ]);
        }
        break;
      case ChatEventType.USER_JOINED:
        setMessages((prev) => [
          ...prev,
          {
            id: `join_${Date.now()}`,
            userId: "system",
            username: "System",
            content: `${event.username} joined the chat`,
            timestamp: event.timestamp ? new Date(Number(event.timestamp.seconds) * 1000 + Math.floor(event.timestamp.nanos / 1000000)) : new Date(),
            type: "system",
          },
        ]);
        break;
      case ChatEventType.USER_LEFT:
        setMessages((prev) => [
          ...prev,
          {
            id: `leave_${Date.now()}`,
            userId: "system",
            username: "System",
            content: `${event.username} left the chat`,
            timestamp: event.timestamp ? new Date(Number(event.timestamp.seconds) * 1000 + Math.floor(event.timestamp.nanos / 1000000)) : new Date(),
            type: "system",
          },
        ]);
        break;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !isConnected) return;

    try {
      await client.sendMessage(create(SendMessageRequestSchema, {
        roomId,
        userId,
        username,
        content: newMessage.trim(),
      }));

      setNewMessage("");
    } catch (err) {
      setError(
        `Failed to send message: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const disconnect = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">Chat Room: {roomId}</h2>
            <p className="text-sm opacity-90">User: {username}</p>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-2 py-1 rounded text-xs ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {!isConnected ? (
              <button
                onClick={connectToChat}
                className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 rounded-lg max-w-xs ${
              message.type === "system"
                ? "bg-gray-200 text-gray-600 text-center text-xs mx-auto"
                : message.userId === userId
                ? "bg-blue-500 text-white ml-auto"
                : "bg-white border"
            }`}
          >
            {message.type !== "system" && (
              <div className="font-semibold text-xs mb-1">
                {message.username}
              </div>
            )}
            <div className={message.type === "system" ? "" : "break-words"}>
              {message.content}
            </div>
            <div className="text-xs opacity-70 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
