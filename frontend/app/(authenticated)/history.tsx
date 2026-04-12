import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import ChatHistoryList from "../../components/ChatHistoryList";
import ScreenHeader from "../../components/ScreenHeader";
import { useSession } from "../../lib/session";
import { TUTORIAL_OVERLAY_SPACE } from "../../lib/tutorial";
import { fetchChatHistory, type ChatSession } from "../../lib/api";

export default function HistoryRoute() {
  const { tutorialRequired } = useSession();
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
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          tutorialRequired && styles.tutorialScreen
        ]}
      >
        <ScreenHeader
          title="Chat History"
          description="Review your previous conversation sessions."
          onBack={() => router.back()}
          backTutorialId="shared-back"
        />

        <Card title="Saved Sessions" tutorialId="history-session-list">
          {status ? <Text style={styles.statusText}>{status}</Text> : null}
          <ChatHistoryList sessions={sessions} />
        </Card>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
    paddingBottom: 24
  },
  tutorialScreen: {
    paddingBottom: TUTORIAL_OVERLAY_SPACE + 24
  },
  statusText: {
    color: "#334155"
  }
});
