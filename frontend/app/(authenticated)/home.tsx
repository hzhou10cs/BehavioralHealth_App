import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ScreenHeader from "../../components/ScreenHeader";
import { useSession } from "../../lib/session";

export default function HomeRoute() {
  const { signOut, userName } = useSession();

  return (
    <AppShell title="Behavioral Health Home">
      <View style={styles.screen}>
        <ScreenHeader
          title={`Hello, ${userName}`}
          description="Choose where you want to go next. Each area opens in its own screen."
          actionLabel="Log Out"
          onAction={() => {
            signOut();
            router.replace("/");
          }}
        />

        <Card title="Navigation">
          <Text style={styles.copy}>
            Open your weekly lessons, continue the active support conversation, or review saved sessions.
          </Text>
          <Button
            accessibilityLabel="Open Lessons"
            onPress={() => router.push("../lessons")}
          >
            Open Lessons
          </Button>
          <Button accessibilityLabel="Open Chat" onPress={() => router.push("/chat")}>
            Open Chat
          </Button>
          <Button accessibilityLabel="Open History" onPress={() => router.push("/history")}>
            Open History
          </Button>
          <Button
            accessibilityLabel="Open Health Profile"
            onPress={() => router.push("../profile")}
          >
            Open Health Profile
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
  copy: {
    color: "#334155",
    lineHeight: 20
  }
});

