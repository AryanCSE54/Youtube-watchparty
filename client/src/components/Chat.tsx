import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

export default function Chat({ messages, onSend }: Props) {
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const message = value.trim();

    if (!message) return;

    onSend(message);
    setValue("");
  };

  return (
    <section className="side-card chat-card">
      <div className="section-heading">
        <h2>Room chat</h2>
        <span className="live-dot">Live</span>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div className="chat-message" key={m.id}>
            <div className="chat-line">
              <strong>{m.username}</strong>
              <time>
                {new Date(m.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <p>{m.message}</p>
          </div>
        ))}

        {messages.length === 0 && (
          <p className="empty-chat">Say hello to the room 👋</p>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="chat-form" onSubmit={submit}>
        <input
          value={value}
          maxLength={500}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write a message..."
          aria-label="Chat message"
        />
        <button type="submit" aria-label="Send message">
          ↑
        </button>
      </form>
    </section>
  );
}