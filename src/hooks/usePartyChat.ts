import { useState } from "react";
import usePartySocket from "partysocket/react";
import type { ChatMessage } from "../../party/chat";

type ServerMsg = ChatMessage | { type: "history"; messages: ChatMessage[] };

export type { ChatMessage };

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
