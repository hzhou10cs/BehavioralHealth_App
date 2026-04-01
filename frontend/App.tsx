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
  const [userEmail, setUserEmail] = useState<string>("");
  const isAuthenticated = Boolean(userName && userEmail);

  const title = useMemo(() => {
    if (screen === "chat") return "Therapy Chat";
    if (screen === "history") return "Chat History";
    return "Behavioral Health Access";
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
            <NavButton
              label={isAuthenticated ? "Account" : "Login"}
              isActive={screen === "login"}
              onPress={() => setScreen("login")}
            />
            <NavButton label="Chat" isActive={screen === "chat"} onPress={() => setScreen("chat")} />
            <NavButton
              label="History"
              isActive={screen === "history"}
              onPress={() => setScreen("history")}
            />
          </View>

          {screen === "login" ? (
            <AuthScreen
              isAuthenticated={isAuthenticated}
              userName={userName}
              userEmail={userEmail}
              onLoggedIn={(info) => {
                setUserName(info.userName);
                setUserEmail(info.email);
                setScreen("chat");
              }}
              onLoggedOut={() => {
                setUserName("");
                setUserEmail("");
                setScreen("login");
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

type AuthMode = "login" | "register";

function AuthScreen({
  isAuthenticated,
  userName: activeUserName,
  userEmail: activeUserEmail,
  onLoggedIn,
  onLoggedOut
}: {
  isAuthenticated: boolean;
  userName: string;
  userEmail: string;
  onLoggedIn: (info: { userName: string; email: string }) => void;
  onLoggedOut: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required");
      return;
    }

    if (mode === "register" && !userName.trim()) {
      setStatus("Name is required");
      return;
    }

    if (mode === "register" && password.length < 8) {
      setStatus("Password must be at least 8 characters");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setStatus("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setStatus(mode === "login" ? "Signing in..." : "Creating account...");
      const result =
        mode === "login"
          ? await login({ email, password })
          : await register({ email, password, userName: userName.trim() });
      setStatus(mode === "login" ? `Welcome back, ${result.userName}` : `Welcome, ${result.userName}`);
      setPassword("");
      setConfirmPassword("");
      onLoggedIn({ userName: result.userName, email: email.trim().toLowerCase() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[auth:${mode}]`, errorMessage);
      if (mode === "login") {
        setStatus("Unable to sign in. Please check your email and password.");
      } else if (errorMessage.toLowerCase().includes("already registered")) {
        setStatus("That email is already registered. Try logging in.");
      } else if (errorMessage.toLowerCase().includes("timed out")) {
        setStatus("Request timed out. Please try again.");
      } else {
        setStatus("Unable to create account right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (isAuthenticated) {
    return (
      <Card title="Account">
        <Text style={styles.accountLabel}>Signed in as</Text>
        <Text style={styles.accountName}>{activeUserName}</Text>
        <Text style={styles.accountEmail}>{activeUserEmail}</Text>
        <Button
          onPress={() => {
            setMode("login");
            setUserName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setStatus("You are logged out");
            onLoggedOut();
          }}
        >
          Log Out
        </Button>
        {status ? <Text style={styles.statusText}>{status}</Text> : null}
      </Card>
    );
  }

  return (
    <Card title="Behavioral Health Access">
      {mode === "register" ? (
        <Input
          label="Name"
          autoCapitalize="words"
          autoCorrect={false}
          value={userName}
          onChangeText={setUserName}
          placeholder="Your name"
        />
      ) : null}
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
      {mode === "register" ? (
        <Input
          label="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      ) : null}
      <Button onPress={handleSubmit} disabled={loading}>
        {loading ? (mode === "login" ? "Signing In..." : "Creating Account...") : mode === "login" ? "Log In" : "Register"}
      </Button>
      <View style={styles.switchAuthRow}>
        <Text style={styles.switchAuthText}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}
        </Text>
        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "register" : "login");
            setStatus("");
            setLoading(false);
          }}
          hitSlop={8}
        >
          <Text style={styles.switchAuthLink}>
            {mode === "login" ? "Sign up here" : "Log in here"}
          </Text>
        </Pressable>
      </View>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
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
  switchAuthRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  switchAuthText: {
    color: "#475569"
  },
  switchAuthLink: {
    color: "#2563eb",
    fontWeight: "700"
  },
  accountLabel: {
    color: "#475569"
  },
  accountName: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "700"
  },
  accountEmail: {
    color: "#334155"
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
