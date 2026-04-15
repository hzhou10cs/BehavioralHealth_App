import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ScreenHeader from "../../components/ScreenHeader";
import { hasActiveConversation } from "../../lib/api";
import { useSession } from "../../lib/session";

export default function HomeRoute() {
  const { beginTutorial, signOut, userName } = useSession();
  const isFocused = useIsFocused();
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let mounted = true;
    hasActiveConversation()
      .then((active) => {
        if (!mounted) return;
        setHasActiveSession(active);
      })
      .catch(() => {
        if (!mounted) return;
        setHasActiveSession(false);
      });

    return () => {
      mounted = false;
    };
  }, [isFocused]);

  const sessionActionLabel = hasActiveSession ? "Continue Session" : "New Session";

  return (
    <AppShell title="Behavioral Health Home">
      <View style={styles.screen}>
        <ScreenHeader
          title={`Hello, ${userName}`}
          description="Choose where you want to go next. Each area opens in its own screen."
          actionLabel="Log Out"
          actionTutorialId="home-log-out"
          onAction={() => {
            signOut();
            router.replace("/");
          }}
        />

        <Card title="Navigation">
          <Text style={styles.copy}>
            Open your lessons, continue the active support conversation, or review saved sessions.
          </Text>
          <Button
            accessibilityLabel="Open Lessons"
            tutorialId="home-open-lessons"
            onPress={() => router.push("../lessons")}
          >
            Open Lessons
          </Button>
          <Button
            accessibilityLabel={sessionActionLabel}
            tutorialId="home-open-chat"
            onPress={() => router.push("/chat")}
          >
            {sessionActionLabel}
          </Button>
          <Button
            accessibilityLabel="Session History"
            tutorialId="home-open-history"
            onPress={() => router.push("/history")}
          >
            Session History
          </Button>
          <Button
            accessibilityLabel="Edit Health Profile"
            tutorialId="home-open-profile"
            onPress={() => router.push("../profile")}
          >
            Edit Health Profile
          </Button>
        </Card>

        {__DEV__ ? (
          <Card title="Developer Testing">
            <Text style={styles.copy}>
              Replay the first-time tutorial for this signed-in session without creating another account.
            </Text>
            <Button accessibilityLabel="Replay tutorial" onPress={beginTutorial}>
              Replay Tutorial
            </Button>
          </Card>
        ) : null}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 14
  },
  copy: {
    color: "#334155",
    lineHeight: 20
  }
});

