import { useMutation } from "@tanstack/react-query";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AIConversationService } from "@/gen/app/ai_conversation_service_pb";
import { create } from "@bufbuild/protobuf";
import { SendMessageRequestSchema, SendMessageResponse } from "@/gen/app/ai_conversation_pb";
import { Language } from "@/types/types";

interface ConversationVariables {
  username: string;
  language: Language;
  character: string;
  audioData: Uint8Array;
}

export const useConversationMutation = () => {
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8000",
    interceptors: [
      (next) => async (req) => {
        // Extract user_id from the request message and add to headers for authentication
        const message = req.message as { userId?: string };
        if (message.userId) {
          req.header.set("X-User-ID", message.userId);
        }
        return await next(req);
      },
    ],
  });
  const client = createClient(AIConversationService, transport);

  const mutateAsync = async function* ({ username, language, character, audioData }: ConversationVariables) {
    try {
      const request = create(SendMessageRequestSchema, {
        userId: `user_${username}`,
        username,
        language,
        character,
        content: { case: "audioData", value: audioData },
        timestamp: {
          seconds: BigInt(Math.floor(Date.now() / 1000)),
          nanos: 0,
        },
      });

      for await (const response of client.sendMessage(request, {
        headers: {
          "X-User-ID": `user_${username}`,
        }
      })) {
        yield response;
      }
    } catch (error) {
      console.error("Failed to send audio:", error);
      if (error instanceof Error) {
        if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
          throw new Error("API quota exceeded. Please wait a moment and try again.");
        }
      }
      throw error;
    }
  };

  return { mutateAsync };
};
