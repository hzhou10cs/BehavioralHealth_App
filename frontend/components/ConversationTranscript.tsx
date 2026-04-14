import { ScrollView, StyleSheet, Text } from "react-native";
import type { ChatMessage } from "../lib/api";
import MessageBubble from "./MessageBubble";

type ConversationTranscriptProps = {
  messages: ChatMessage[];
  status?: string;
  emptyLabel?: string;
};

export default function ConversationTranscript({
  messages,
  status,
  emptyLabel = "No messages yet."
}: ConversationTranscriptProps) {
  return (
    <>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      <ScrollView style={styles.messagesWrap} contentContainerStyle={styles.messagesContent}>
        {messages.length ? (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        ) : !status ? (
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  statusText: {
    color: "#334155"
  },
  messagesWrap: {
    maxHeight: 280,
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc"
  },
  messagesContent: {
    padding: 10
  },
  emptyText: {
    color: "#64748b"
  }
});
