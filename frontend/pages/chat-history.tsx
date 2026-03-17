import { useEffect, useState } from "react";
import Card from "@/components/Card";
import ChatHistoryList from "@/components/ChatHistoryList";
import { fetchChatHistory, type ChatSession } from "@/lib/api";

export default function ChatHistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [status, setStatus] = useState("Loading history...");

  useEffect(() => {
    let mounted = true;
    fetchChatHistory()
      .then((items) => {
        if (!mounted) return;
        setSessions(items);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load chat history");
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main>
      <Card title="Chat History">
        <p aria-live="polite">{status}</p>
        <ChatHistoryList sessions={sessions} />
      </Card>
    </main>
  );
}
