import type * as Party from "partykit/server";

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

type IncomingMsg = ChatMessage;
type OutgoingMsg = ChatMessage | { type: "history"; messages: ChatMessage[] };

const MAX_MESSAGES = 100;

export default class ChatServer implements Party.Server {
  options: Party.ServerOptions = { hibernate: true };

  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    const messages = (await this.room.storage.get<ChatMessage[]>("messages")) ?? [];
    const out: OutgoingMsg = { type: "history", messages };
    conn.send(JSON.stringify(out));
  }

  async onMessage(raw: string, _sender: Party.Connection) {
    const msg = JSON.parse(raw) as IncomingMsg;

    const messages = (await this.room.storage.get<ChatMessage[]>("messages")) ?? [];
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
    await this.room.storage.put("messages", messages);

    this.room.broadcast(raw);
  }
}
