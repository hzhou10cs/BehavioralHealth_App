import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../lib/api";

type MessageBubbleProps = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={styles.role}>{message.role}:</Text>
        <Text style={styles.text}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
    width: "100%"
  },
  userRow: {
    alignItems: "flex-end"
  },
  assistantRow: {
    alignItems: "flex-start"
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3
  },
  userBubble: {
    backgroundColor: "#dbeafe"
  },
  assistantBubble: {
    backgroundColor: "#eef2ff"
  },
  role: {
    textTransform: "capitalize",
    fontWeight: "700",
    color: "#1e293b"
  },
  text: {
    color: "#0f172a"
  }
});
