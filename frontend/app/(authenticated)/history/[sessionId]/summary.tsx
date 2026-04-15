import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import AppShell from "../../../../components/AppShell";
import Card from "../../../../components/Card";
import ScreenHeader from "../../../../components/ScreenHeader";
import { fetchConversationSummary } from "../../../../lib/api";
import { useSession } from "../../../../lib/session";
import { TUTORIAL_OVERLAY_SPACE } from "../../../../lib/tutorial";

export default function ConversationSummaryRoute() {
  const { tutorialRequired } = useSession();
  const params = useLocalSearchParams<{ sessionId?: string; label?: string }>();
  const sessionId = readParam(params.sessionId);
  const sessionLabel = useMemo(() => {
    const label = readParam(params.label);
    return label ? safeDecodeParam(label) : "Saved Session";
  }, [params.label]);
  const [summaryText, setSummaryText] = useState("");
  const [status, setStatus] = useState("Loading summary...");

  useEffect(() => {
    if (!sessionId) {
      setStatus("Could not load summary");
      return;
    }

    let mounted = true;
    setStatus("Loading summary...");

    fetchConversationSummary(sessionId)
      .then((summary) => {
        if (!mounted) return;
        setSummaryText(summary.report);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load summary");
      });

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return (
    <AppShell title="Session Summary">
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          tutorialRequired && styles.tutorialScreen
        ]}
      >
        <ScreenHeader
          title="Session Summary"
          description="Review the extracted summary for this completed session."
          onBack={() => router.replace("/history")}
        />

        <Card title={`${sessionLabel} Summary`}>
          {status ? <Text style={styles.status}>{status}</Text> : null}
          {!status ? <Text style={styles.summary}>{summaryText}</Text> : null}
        </Card>
      </ScrollView>
    </AppShell>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function safeDecodeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
    paddingBottom: 24
  },
  tutorialScreen: {
    paddingBottom: TUTORIAL_OVERLAY_SPACE + 24
  },
  status: {
    color: "#334155"
  },
  summary: {
    color: "#1e293b",
    lineHeight: 20
  }
});
