import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import ChatHistoryList from "../../components/ChatHistoryList";
import ScreenHeader from "../../components/ScreenHeader";
import { fetchChatHistory, type ChatSession } from "../../lib/api";

export default function HistoryRoute() {
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
    <AppShell title="Chat History">
      <View style={styles.screen}>
        <ScreenHeader
          title="Chat History"
          description="Review your previous conversation sessions."
          onBack={() => router.back()}
        />

        <Card title="Saved Sessions">
          {status ? <Text style={styles.statusText}>{status}</Text> : null}
          <ChatHistoryList sessions={sessions} />
        </Card>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 14
  },
  statusText: {
    color: "#334155"
  }
});
