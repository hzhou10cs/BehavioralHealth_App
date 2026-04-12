import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import MessageBubble from "../../components/MessageBubble";
import ScreenHeader from "../../components/ScreenHeader";
import { useTutorialLayout } from "../../components/TutorialLayoutContext";
import { useSession } from "../../lib/session";
import { TUTORIAL_OVERLAY_SPACE, TUTORIAL_REVEAL_TARGETS } from "../../lib/tutorial";
import { fetchMessages, sendMessage, type ChatMessage } from "../../lib/api";

export default function ChatRoute() {
  const { userName, tutorialRequired, activeTutorialTargetId } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Loading messages...");
  const scrollRef = useRef<ScrollView | null>(null);
  const { requestMeasure } = useTutorialLayout();

  useEffect(() => {
    let mounted = true;

    fetchMessages()
      .then((data) => {
        if (!mounted) return;
        setMessages(data);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load messages");
      });

    return () => {
      mounted = false;
    };
  }, []);

  function revealTutorialTarget() {
    if (activeTutorialTargetId && TUTORIAL_REVEAL_TARGETS.has(activeTutorialTargetId)) {
      scrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => requestMeasure(activeTutorialTargetId), 250);
    }
  }

  useEffect(() => {
    revealTutorialTarget();
  }, [activeTutorialTargetId]);

  async function onSend() {
    if (!draft.trim()) {
      return;
    }

    try {
      setStatus("Sending...");
      const updatedMessages = await sendMessage(draft.trim());
      setMessages(updatedMessages);
      setDraft("");
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Message failed to send");
    }
  }

  return (
    <AppShell title="Therapy Chat" keyboardAware>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.screen,
          tutorialRequired && styles.tutorialScreen
        ]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={revealTutorialTarget}
      >
        <ScreenHeader
          title="Therapy Chat"
          description={`Continue the active conversation for ${userName}.`}
          onBack={() => router.back()}
          backTutorialId="shared-back"
        />

        <Card title={`Active Chat (${userName})`}>
          {status ? <Text style={styles.statusText}>{status}</Text> : null}
          <ScrollView style={styles.messagesWrap} contentContainerStyle={styles.messagesContent}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ScrollView>
          <Input
            label="Message"
            tutorialId="chat-message-input"
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
          />
          <Button accessibilityLabel="Send" tutorialId="chat-send" onPress={onSend}>
            Send
          </Button>
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
  }
});
