import { useEffect, useRef } from "react";
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
  const transcriptRef = useRef<ScrollView | null>(null);

  function scrollToLatest(animated: boolean) {
    transcriptRef.current?.scrollToEnd({ animated });
  }

  useEffect(() => {
    const timer = setTimeout(() => scrollToLatest(true), 0);
    return () => clearTimeout(timer);
  }, [messages.length, messages[messages.length - 1]?.id, status]);

  return (
    <>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      <ScrollView
        ref={transcriptRef}
        style={styles.messagesWrap}
        contentContainerStyle={styles.messagesContent}
        onLayout={() => scrollToLatest(false)}
        onContentSizeChange={() => scrollToLatest(true)}
      >
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
    color: "#475569",
    fontSize: 13
  },
  messagesWrap: {
    maxHeight: 420,
    minHeight: 220
  },
  messagesContent: {
    paddingVertical: 8,
    gap: 6
  },
  emptyText: {
    color: "#64748b"
  }
});
