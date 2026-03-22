import { useCallback, useEffect, useMemo, useState } from "react";
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
  createConversation,
  fetchChatHistory,
  fetchMessages,
  fetchProfile,
  login,
  sendMessage,
  signUp,
  updateProfile,
  type ChatMessage,
  type ChatSession,
  type Profile
} from "./lib/api";

type Screen = "login" | "signup" | "home" | "chat" | "history" | "profile";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [token, setToken] = useState("");
  const [userName, setUserName] = useState("");

  const title = useMemo(() => {
    if (screen === "signup") return "Create Account";
    if (screen === "home") return "Home";
    if (screen === "chat") return "Chat";
    if (screen === "history") return "Chat History";
    if (screen === "profile") return "Update Profile";
    return "Log In";
  }, [screen]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.appHeading}>BehavioralHealth Demo</Text>
          <Text style={styles.subHeading}>{title}</Text>

          {screen === "login" ? (
            <LoginScreen
              onSuccess={(nextToken, name) => {
                setToken(nextToken);
                setUserName(name);
                setScreen("home");
              }}
              onGoSignUp={() => setScreen("signup")}
            />
          ) : null}

          {screen === "signup" ? (
            <SignUpScreen
              onSuccess={(nextToken, name) => {
                setToken(nextToken);
                setUserName(name);
                setScreen("home");
              }}
              onGoLogin={() => setScreen("login")}
            />
          ) : null}

          {screen === "home" ? (
            <HomeScreen
              userName={userName}
              onOpenChat={() => setScreen("chat")}
              onOpenHistory={() => setScreen("history")}
              onOpenProfile={() => setScreen("profile")}
              onLogout={() => {
                setToken("");
                setUserName("");
                setScreen("login");
              }}
            />
          ) : null}

          {screen === "chat" ? (
            <ChatScreen token={token} userName={userName} onBack={() => setScreen("home")} />
          ) : null}

          {screen === "history" ? <HistoryScreen token={token} onBack={() => setScreen("home")} /> : null}

          {screen === "profile" ? (
            <ProfileScreen
              token={token}
              onBack={() => setScreen("home")}
              onUpdated={(name) => setUserName(name)}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginScreen({
  onSuccess,
  onGoSignUp
}: {
  onSuccess: (token: string, userName: string) => void;
  onGoSignUp: () => void;
}) {
  const [email, setEmail] = useState("demo@health.app");
  const [password, setPassword] = useState("password123");
  const [status, setStatus] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required.");
      return;
    }

    try {
      setStatus("Signing in...");
      const result = await login({ email, password });
      onSuccess(result.token, result.userName);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  return (
    <Card title="Log In">
      <Input
        label="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button onPress={handleLogin}>Log In</Button>
      <Pressable onPress={onGoSignUp}>
        <Text style={styles.linkText}>Need an account? Sign up</Text>
      </Pressable>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
    </Card>
  );
}

function SignUpScreen({
  onSuccess,
  onGoLogin
}: {
  onSuccess: (token: string, userName: string) => void;
  onGoLogin: () => void;
}) {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleSignUp() {
    if (!userName.trim() || !email.trim() || !password.trim()) {
      setStatus("Name, email, and password are required.");
      return;
    }

    try {
      setStatus("Creating account...");
      console.log("here")
      const result = await signUp({ userName, email, password });
      onSuccess(result.token, result.userName);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create account.");
    }
  }

  return (
    <Card title="Create Account">
      <Input label="Name" value={userName} onChangeText={setUserName} />
      <Input
        label="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button onPress={handleSignUp}>Sign Up</Button>
      <Pressable onPress={onGoLogin}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </Pressable>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
    </Card>
  );
}

function HomeScreen({
  userName,
  onOpenChat,
  onOpenHistory,
  onOpenProfile,
  onLogout
}: {
  userName: string;
  onOpenChat: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <Card title="Home">
      <Text style={styles.welcome}>Welcome, {userName || "there"}</Text>
      <Button onPress={onOpenChat}>Open Chat</Button>
      <Button onPress={onOpenHistory}>View Chat History</Button>
      <Button onPress={onOpenProfile}>Update Profile</Button>
      <Button onPress={onLogout}>Log Out</Button>
    </Card>
  );
}

function ChatScreen({
  token,
  userName,
  onBack
}: {
  token: string;
  userName: string;
  onBack: () => void;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Loading conversations...");

  const loadConversations = useCallback(async () => {
    const history = await fetchChatHistory(token);
    setSessions(history);
    if (history.length > 0) {
      setConversationId(history[0].id);
      return history[0].id;
    }
    const created = await createConversation(token, "My First Session");
    setSessions([created]);
    setConversationId(created.id);
    return created.id;
  }, [token]);

  useEffect(() => {
    let active = true;

    loadConversations()
      .then((id) => fetchMessages(token, id))
      .then((items) => {
        if (!active) return;
        setMessages(items);
        setStatus("");
      })
      .catch(() => {
        if (!active) return;
        setStatus("Could not load chat data");
      });

    return () => {
      active = false;
    };
  }, [loadConversations, token]);

  async function onSend() {
    if (!draft.trim() || !conversationId) return;

    try {
      await sendMessage(token, conversationId, draft.trim());
      const next = await fetchMessages(token, conversationId);
      setMessages(next);
      setDraft("");
      setStatus("");
    } catch {
      setStatus("Message failed to send");
    }
  }

  return (
    <Card title={userName ? `Chat (${userName})` : "Chat"}>
      <Button onPress={onBack}>Back To Home</Button>
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

function HistoryScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [status, setStatus] = useState("Loading history...");

  useEffect(() => {
    let active = true;

    fetchChatHistory(token)
      .then((items) => {
        if (!active) return;
        setSessions(items);
        setStatus("");
      })
      .catch(() => {
        if (!active) return;
        setStatus("Could not load history");
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <Card title="Chat History">
      <Button onPress={onBack}>Back To Home</Button>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
      <ChatHistoryList sessions={sessions} />
    </Card>
  );
}

function ProfileScreen({
  token,
  onBack,
  onUpdated
}: {
  token: string;
  onBack: () => void;
  onUpdated: (name: string) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userName, setUserName] = useState("");
  const [bio, setBio] = useState("");
  const [goalsJson, setGoalsJson] = useState("{}");
  const [status, setStatus] = useState("Loading profile...");

  useEffect(() => {
    let active = true;

    fetchProfile(token)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setUserName(data.userName);
        setBio(data.bio ?? "");
        setGoalsJson(JSON.stringify(data.goals ?? {}, null, 2));
        setStatus("");
      })
      .catch(() => {
        if (!active) return;
        setStatus("Could not load profile");
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function onSave() {
    try {
      const parsedGoals = JSON.parse(goalsJson || "{}");
      const updated = await updateProfile(token, {
        userName,
        bio,
        goals: parsedGoals
      });
      setProfile(updated);
      onUpdated(updated.userName);
      setStatus("Profile saved");
    } catch {
      setStatus("Save failed. Ensure goals is valid JSON.");
    }
  }

  return (
    <Card title="Update Profile">
      <Button onPress={onBack}>Back To Home</Button>
      <Text style={styles.metaText}>Email: {profile?.email ?? "-"}</Text>
      <Input label="Name" value={userName} onChangeText={setUserName} />
      <Input label="Bio" value={bio} onChangeText={setBio} multiline numberOfLines={3} />
      <Input
        label="Goals (JSON)"
        value={goalsJson}
        onChangeText={setGoalsJson}
        multiline
        numberOfLines={4}
      />
      <Button onPress={onSave}>Save Profile</Button>
      {status ? <Text style={styles.statusText}>{status}</Text> : null}
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
  welcome: {
    color: "#0f172a",
    fontWeight: "600"
  },
  linkText: {
    color: "#1d4ed8",
    fontWeight: "600"
  },
  metaText: {
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
