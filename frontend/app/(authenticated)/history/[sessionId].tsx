import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import AppShell from "../../../components/AppShell";
import Card from "../../../components/Card";
import ConversationTranscript from "../../../components/ConversationTranscript";
import ScreenHeader from "../../../components/ScreenHeader";
import { useSession } from "../../../lib/session";
import { TUTORIAL_OVERLAY_SPACE } from "../../../lib/tutorial";
import { fetchConversationHistory, type ChatMessage } from "../../../lib/api";

export default function ConversationHistoryRoute() {
  const { tutorialRequired } = useSession();
  const params = useLocalSearchParams<{ sessionId?: string; title?: string }>();
  const sessionId = readParam(params.sessionId);
  const sessionTitle = useMemo(() => {
    const title = readParam(params.title);
    return title ? safeDecodeParam(title) : "Saved Session";
  }, [params.title]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState("Loading conversation...");

  useEffect(() => {
    if (!sessionId) {
      setStatus("Could not load conversation");
      return;
    }

    let mounted = true;
    setStatus("Loading conversation...");

    fetchConversationHistory(sessionId)
      .then((items) => {
        if (!mounted) return;
        setMessages(items);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load conversation");
      });

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return (
    <AppShell title="Conversation History">
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          tutorialRequired && styles.tutorialScreen
        ]}
      >
        <ScreenHeader
          title="Conversation History"
          description="Review this saved session in a read-only transcript."
          onBack={() => router.back()}
        />

        <Card title={sessionTitle}>
          <Text style={styles.note}>Messages are shown exactly as they were sent in this session.</Text>
          <ConversationTranscript
            messages={messages}
            status={status}
            emptyLabel="No messages were saved for this session."
          />
        </Card>
      </ScrollView>
    </AppShell>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function safeDecodeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
    paddingBottom: 24
  },
  tutorialScreen: {
    paddingBottom: TUTORIAL_OVERLAY_SPACE + 24
  },
  note: {
    color: "#475569",
    lineHeight: 20
  }
});
