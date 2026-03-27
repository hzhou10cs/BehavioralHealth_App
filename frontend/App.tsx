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
  register,
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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.navButton, isActive && styles.navButtonActive]}
    >
      <Text style={[styles.navText, isActive && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (userName: string) => void }) {
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("password123");
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setStatus(isRegistering ? "Creating account..." : "Signing in...");
      const result = isRegistering
        ? await register({ email, password })
        : await login({ email, password });
      setStatus(`Welcome, ${result.userName}`);
      onLoggedIn(result.userName);
    } catch (error) {
      const fallback = isRegistering ? "Unable to create account" : "Unable to sign in";
      const message = error instanceof Error ? error.message : fallback;
      setStatus(message);
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
      <Button accessibilityLabel={isRegistering ? "Create Account" : "Log In"} onPress={handleAuth} disabled={loading}>
        {loading ? (isRegistering ? "Creating Account..." : "Signing In...") : isRegistering ? "Create Account" : "Log In"}
      </Button>
      <Pressable
        accessibilityLabel={isRegistering ? "Switch to login" : "Switch to create account"}
        onPress={() => {
          setIsRegistering((current) => !current);
          setStatus("");
        }}
      >
        <Text style={styles.switchText}>
          {isRegistering
            ? "Already have an account? Log in"
            : "Need an account? Create one"}
        </Text>
      </Pressable>
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
    <Card title={userName ? `Therapy Chat (${userName})` : "Therapy Chat"}>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      <ScrollView style={styles.messagesWrap} contentContainerStyle={styles.messagesContent}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ScrollView>
      <Input label="Message" value={draft} onChangeText={setDraft} placeholder="Type a message" />
      <Button accessibilityLabel="Send" onPress={onSend}>Send</Button>
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
  switchText: {
    color: "#1d4ed8",
    fontWeight: "600"
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
