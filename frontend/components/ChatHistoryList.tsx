import type { ChatSession } from "@/lib/api";

type ChatHistoryListProps = {
  sessions: ChatSession[];
};

export default function ChatHistoryList({ sessions }: ChatHistoryListProps) {
  if (!sessions.length) {
    return <p>No sessions found.</p>;
  }

  return (
    <ul style={{ paddingLeft: 0 }}>
      {sessions.map((session) => (
        <li
          key={session.id}
          style={{
            listStyle: "none",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0.7rem",
            marginBottom: "0.6rem",
            background: "#ffffff"
          }}
        >
          <strong>{session.title}</strong>
          <div>
            <small>
              Last updated:{" "}
              {new Date(session.updatedAt).toLocaleDateString("en-US")}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}
