import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import MessageBubble from "@/components/MessageBubble";
import { fetchMessages, sendMessage, type ChatMessage } from "@/lib/api";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Loading messages...");

  useEffect(() => {
    let mounted = true;
    fetchMessages()
      .then((data) => {
        if (!mounted) return;
        setMessages(data);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load messages");
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;

    try {
      const created = await sendMessage(draft);
      setMessages((prev) => [...prev, created]);
      setDraft("");
    } catch {
      setStatus("Message failed to send");
    }
  }

  return (
    <main>
      <Card title="Therapy Chat">
        <p aria-live="polite">{status}</p>
        <ul style={{ padding: 0, marginTop: "0.5rem" }}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ul>
        <form onSubmit={onSend} className="stack">
          <Input
            label="Message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit">Send</Button>
        </form>
      </Card>
    </main>
  );
}
