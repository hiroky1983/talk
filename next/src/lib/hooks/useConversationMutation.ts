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
  });
  const client = createClient(AIConversationService, transport);

  return useMutation<SendMessageResponse, Error, ConversationVariables>({
    mutationFn: async ({ username, language, character, audioData }) => {
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

      return await client.sendMessage(request);
    },
    onError: (error) => {
      console.error("Failed to send audio:", error);
      // Extract meaningful error message
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("API quota exceeded. Please wait a moment and try again.");
      }
      throw error;
    },
  });
};
