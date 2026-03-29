import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import ScreenHeader from "../components/ScreenHeader";
import { useSession } from "../lib/session";

export default function LoginRoute() {
  const { isAuthenticated, signIn, signUp } = useSession();
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("password123");
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setStatus(isRegistering ? "Creating account..." : "Signing in...");

      if (isRegistering) {
        await signUp({ email, password });
      } else {
        await signIn({ email, password });
      }

      setStatus("");
      router.replace("/home");
    } catch (error) {
      const fallback = isRegistering ? "Unable to create account" : "Unable to sign in";
      setStatus(error instanceof Error ? error.message : fallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Behavioral Health Login">
      <View style={styles.screen}>
        <ScreenHeader
          title="Welcome"
          description="Sign in to access your chat sessions and conversation history."
        />

        <Card title="Account Access">
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
          <Button
            accessibilityLabel={isRegistering ? "Create Account" : "Log In"}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading
              ? isRegistering
                ? "Creating Account..."
                : "Signing In..."
              : isRegistering
                ? "Create Account"
                : "Log In"}
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
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 14
  },
  switchText: {
    color: "#1d4ed8",
    fontWeight: "600"
  },
  statusText: {
    color: "#334155"
  }
});
