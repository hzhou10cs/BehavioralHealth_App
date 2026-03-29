import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import MessageBubble from "../../components/MessageBubble";
import ScreenHeader from "../../components/ScreenHeader";
import { fetchMessages, sendMessage, type ChatMessage } from "../../lib/api";
import { useSession } from "../../lib/session";

export default function ChatRoute() {
  const { userName } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Loading messages...");

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
      <View style={styles.screen}>
        <ScreenHeader
          title="Therapy Chat"
          description={`Continue the active conversation for ${userName}.`}
          onBack={() => router.back()}
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
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
          />
          <Button accessibilityLabel="Send" onPress={onSend}>
            Send
          </Button>
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
