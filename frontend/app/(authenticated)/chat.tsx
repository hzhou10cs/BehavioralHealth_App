import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ConversationTranscript from "../../components/ConversationTranscript";
import Input from "../../components/Input";
import ScreenHeader from "../../components/ScreenHeader";
import { useTutorialLayout } from "../../components/TutorialLayoutContext";
import { useSession } from "../../lib/session";
import { TUTORIAL_OVERLAY_SPACE, TUTORIAL_REVEAL_TARGETS } from "../../lib/tutorial";
import {
  fetchCurrentSessionNumber,
  fetchMessages,
  sendMessage,
  type ChatMessage,
  endConversation,
} from "../../lib/api";

export default function ChatRoute() {
  const { userName, tutorialRequired, activeTutorialTargetId } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Loading messages...");
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [sessionSummary, setSessionSummary] = useState("");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(1);
  const scrollRef = useRef<ScrollView | null>(null);
  const { requestMeasure } = useTutorialLayout();
  const sessionTitle = `Session ${sessionNumber}`;

  useEffect(() => {
    let mounted = true;

    fetchMessages()
      .then((data) => {
        if (!mounted) return;
        setMessages(data);
        setSessionSummary("");
        setSessionEnded(false);
        setIsWaitingResponse(false);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load messages");
      });

    fetchCurrentSessionNumber()
      .then((currentSessionNumber) => {
        if (!mounted) return;
        setSessionNumber(currentSessionNumber);
      })
      .catch(() => {
        if (!mounted) return;
        setSessionNumber(1);
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
    const nextText = draft.trim();
    if (!nextText || sessionEnded || isWaitingResponse) {
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      text: nextText,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setDraft("");
    setIsWaitingResponse(true);
    setStatus("Waiting for response from agent...");

    try {
      const updatedMessages = await sendMessage(nextText);
      setMessages(updatedMessages);
      setStatus("");
    } catch (error) {
      try {
        const refreshedMessages = await fetchMessages();
        setMessages(refreshedMessages);
      } catch {
        // Keep optimistic message if refresh fails.
      }
      setStatus(error instanceof Error ? error.message : "Message failed to send");
    } finally {
      setIsWaitingResponse(false);
    }
  }

  async function onEndSession() {
    if (sessionEnded) {
      return;
    }

    try {
      setStatus("Generating session summary...");
      const summary = await endConversation();
      if (!summary) {
        setStatus("No active conversation to end.");
        return;
      }
      setSessionSummary(summary.report);
      setMessages([]);
      setDraft("");
      setSessionEnded(true);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not end session");
    }
  }

  return (
    <AppShell title={sessionTitle} keyboardAware>
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
          title={sessionTitle}
          description={`Continue the active conversation for ${userName}.`}
          onBack={() => router.back()}
          backTutorialId="shared-back"
        />

        <Card title={`Active Chat (${userName})`}>
          {sessionEnded ? (
            <View style={styles.summaryWrap}>
              <Text style={styles.summaryHeader}>-- Summary of current session --</Text>
              <Text style={styles.summaryBody}>{sessionSummary}</Text>
              <Text style={styles.summaryFooter}>--END--</Text>
              <Text style={styles.summaryTip}>Tip: report can be viewed in history page.</Text>
            </View>
          ) : (
            <ConversationTranscript messages={messages} status={status} />
          )}
          <Input
            label="Message"
            tutorialId="chat-message-input"
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
            editable={!sessionEnded}
          />
          <Button
            accessibilityLabel="Send"
            tutorialId="chat-send"
            onPress={onSend}
            disabled={sessionEnded || isWaitingResponse}
          >
            {isWaitingResponse ? "Waiting response..." : "Send"}
          </Button>
          <Button
            accessibilityLabel="End Conversation"
            onPress={onEndSession}
            disabled={sessionEnded || isWaitingResponse}
          >
            End Conversation
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
  summaryWrap: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    padding: 12,
    gap: 8
  },
  summaryHeader: {
    color: "#0f172a",
    fontWeight: "700"
  },
  summaryBody: {
    color: "#1e293b",
    lineHeight: 20
  },
  summaryFooter: {
    color: "#0f172a",
    fontWeight: "700"
  },
  summaryTip: {
    color: "#475569"
  }
});
