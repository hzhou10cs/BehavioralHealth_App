import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../lib/api";
import { formatMessageTimestamp } from "../lib/formatMessageTimestamp";

type MessageBubbleProps = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const timestamp = formatMessageTimestamp(message.createdAt);
  const roleLabel = isUser ? "You" : "Coach";

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={styles.role}>{roleLabel}</Text>
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.text}
        </Text>
        {timestamp ? (
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {timestamp}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%"
  },
  userRow: {
    alignItems: "flex-end",
    marginBottom: 8
  },
  assistantRow: {
    alignItems: "stretch",
    marginBottom: 12
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3
  },
  userBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#bfdbfe"
  },
  assistantBubble: {
    width: "100%",
    borderRadius: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 2
  },
  role: {
    fontWeight: "700",
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  text: {
    color: "#0f172a",
    lineHeight: 22,
    fontSize: 16
  },
  userText: {
    fontSize: 15
  },
  assistantText: {
    fontSize: 16
  },
  timestamp: {
    fontSize: 12,
    color: "#64748b"
  },
  userTimestamp: {
    textAlign: "right"
  },
  assistantTimestamp: {
    textAlign: "left"
  }
});
