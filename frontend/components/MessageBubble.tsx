import type { ChatMessage } from "@/lib/api";

type MessageBubbleProps = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <li
      aria-label={`${message.role}-message`}
      style={{
        listStyle: "none",
        marginBottom: "0.6rem",
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start"
      }}
    >
      <div
        style={{
          background: isUser ? "#dbeafe" : "#eef2ff",
          borderRadius: "10px",
          padding: "0.6rem 0.75rem",
          maxWidth: "80%"
        }}
      >
        <strong style={{ textTransform: "capitalize" }}>{message.role}:</strong>{" "}
        {message.text}
      </div>
    </li>
  );
}
