import { useState } from "react";
import usePartySocket from "partysocket/react";

// Mirrors the ChatMessage interface in party/chat.ts — kept separate to avoid
// bundling the server-only partykit/server package into the client build.
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

type ServerMsg = ChatMessage | { type: "history"; messages: ChatMessage[] };

export function usePartyChat(
  circleId: string,
  user: { id: string; username: string; avatar_url: string | null } | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  const socket = usePartySocket({
    host: import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999",
    room: circleId,
    onOpen() {
      setConnected(true);
    },
    onClose() {
      setConnected(false);
    },
    onMessage(event: MessageEvent) {
      const data = JSON.parse(event.data as string) as ServerMsg;
      if ("type" in data && data.type === "history") {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...prev, data as ChatMessage]);
      }
    },
  });

  function sendMessage(content: string) {
    if (!user || !content.trim()) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    socket.send(JSON.stringify(msg));
  }

  return { messages, sendMessage, connected };
}
