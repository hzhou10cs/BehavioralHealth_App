import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ConversationTranscript from "../../components/ConversationTranscript";
import Input from "../../components/Input";
import ScreenHeader from "../../components/ScreenHeader";
import { useTutorialLayout } from "../../components/TutorialLayoutContext";
import { useSession } from "../../lib/session";
import { TUTORIAL_OVERLAY_SPACE, TUTORIAL_REVEAL_TARGETS } from "../../lib/tutorial";
import { fetchMessages, sendMessage, type ChatMessage, endConversation } from "../../lib/api";

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
          <ConversationTranscript messages={messages} status={status} />
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
          <Button accessibilityLabel="End Conversation" onPress={() => { 
            endConversation(); 
            setMessages([]); 
            setDraft(""); 
            setStatus("Conversation ended. Start a new conversation."); 
          }}>
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
  }
});
