import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
      {sessions.map((session, index) => {
        const sessionLabel = `Session ${index + 1}`;
        const subtitle = formatSessionSubtitle(session.lessonNumber, session.updatedAt);
        return (
        <View key={session.id} style={styles.item}>
          <View style={styles.itemMain}>
            <Text style={styles.title}>{sessionLabel}</Text>
            <Text style={styles.date}>{subtitle}</Text>
          </View>
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open history for ${sessionLabel}`}
              onPress={() =>
                router.push(
                  (`/history/${session.id}?label=${encodeURIComponent(sessionLabel)}`) as never
                )
              }
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.actionButtonText}>History</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open summary for ${sessionLabel}`}
              onPress={() =>
                router.push(
                  (`/history/${session.id}/summary?label=${encodeURIComponent(sessionLabel)}`) as never
                )
              }
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.actionButtonText}>Summary</Text>
            </Pressable>
          </View>
        </View>
      )})}
    </View>
  );
}

function formatSessionSubtitle(lessonNumber: number, timestamp: string) {
  const date = new Date(timestamp);
  const dateText = date.toLocaleDateString("en-US");
  const timeText = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Lesson ${lessonNumber} - ${dateText} - ${timeText}`;
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
    overflow: "hidden",
    backgroundColor: "#ffffff",
    gap: 8
  },
  itemMain: {
    padding: 12,
    gap: 4
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#782F40",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#782F40"
  },
  pressedButton: {
    opacity: 0.85
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  title: {
    fontWeight: "700",
    color: "#0f172a"
  },
  date: {
    color: "#475569"
  }
});
