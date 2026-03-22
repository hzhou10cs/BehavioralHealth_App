import { StyleSheet, Text, View } from "react-native";
import type { ChatSession } from "../lib/api";

type ChatHistoryListProps = {
  sessions: ChatSession[];
};

export default function ChatHistoryList({ sessions }: ChatHistoryListProps) {
  if (!sessions.length) {
    return <Text style={styles.empty}>No sessions found.</Text>;
  }

  return (
    <View style={styles.list}>
      {sessions.map((session) => (
        <View key={session.id} style={styles.item}>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.date}>
            Last updated: {new Date(session.updatedAt).toLocaleDateString("en-US")}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: "#475569"
  },
  list: {
    gap: 10
  },
  item: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
    gap: 4
  },
  title: {
    fontWeight: "700",
    color: "#0f172a"
  },
  date: {
    color: "#475569"
  }
});
