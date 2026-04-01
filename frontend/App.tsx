import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Button from "./components/Button";
import Card from "./components/Card";
import ChatHistoryList from "./components/ChatHistoryList";
import Input from "./components/Input";
import MessageBubble from "./components/MessageBubble";
import {
  fetchChatHistory,
  fetchMessages,
  login,
  sendMessage,
  type ChatMessage,
  type ChatSession
} from "./lib/api";

type Screen = "login" | "chat" | "history";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [userName, setUserName] = useState<string>("");

  const title = useMemo(() => {
    if (screen === "chat") return "Therapy Chat";
    if (screen === "history") return "Chat History";
    return "Behavioral Health Login";
  }, [screen]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.appHeading}>BehavioralHealth App</Text>
          <Text style={styles.subHeading}>{title}</Text>

          <View style={styles.navRow}>
            <NavButton label="Login" isActive={screen === "login"} onPress={() => setScreen("login")} />
            <NavButton label="Chat" isActive={screen === "chat"} onPress={() => setScreen("chat")} />
            <NavButton
              label="History"
              isActive={screen === "history"}
              onPress={() => setScreen("history")}
            />
          </View>

          {screen === "login" ? (
            <LoginScreen
              onLoggedIn={(name) => {
                setUserName(name);
                setScreen("chat");
              }}
            />
          ) : null}

          {screen === "chat" ? <ChatScreen userName={userName} /> : null}
          {screen === "history" ? <HistoryScreen /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NavButton({
  label,
  isActive,
  onPress
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.navButton, isActive && styles.navButtonActive]}>
      <Text style={[styles.navText, isActive && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (userName: string) => void }) {
  const [email, setEmail] = useState("demo@health.app");
  const [password, setPassword] = useState("password123");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setStatus("Signing in...");
      const result = await login({ email, password });
      setStatus(`Welcome, ${result.userName}`);
      onLoggedIn(result.userName);
    } catch {
      setStatus("Unable to sign in (demo password is password123)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Behavioral Health Login">
      <Input
        label="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button onPress={handleLogin} disabled={loading}>
        {loading ? "Signing In..." : "Log In"}
      </Button>
      <Text style={styles.statusText}>{status}</Text>
    </Card>
  );
}

function ChatScreen({ userName }: { userName: string }) {
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
      const created = await sendMessage(draft.trim());
      setMessages((prev) => [...prev, created]);
      setDraft("");
      setStatus("");
    } catch {
      setStatus("Message failed to send");
    }
  }

  return (
    <Card title={userName ? `Therapy Chat (${userName})` : "Therapy Chat"}>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      <ScrollView style={styles.messagesWrap} contentContainerStyle={styles.messagesContent}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ScrollView>
      <Input label="Message" value={draft} onChangeText={setDraft} placeholder="Type a message" />
      <Button onPress={onSend}>Send</Button>
    </Card>
  );
}

function HistoryScreen() {
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
    <Card title="Chat History">
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      <ChatHistoryList sessions={sessions} />
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9"
  },
  flex: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 12
  },
  appHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a"
  },
  subHeading: {
    color: "#475569",
    marginTop: -4,
    marginBottom: 6
  },
  navRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6
  },
  navButton: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#eff6ff"
  },
  navButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb"
  },
  navText: {
    color: "#1e3a8a",
    fontWeight: "600"
  },
  navTextActive: {
    color: "#ffffff"
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
