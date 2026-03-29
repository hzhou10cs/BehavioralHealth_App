import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../../components/AppShell";
import Button from "../../../components/Button";
import Card from "../../../components/Card";
import ScreenHeader from "../../../components/ScreenHeader";
import { fetchLessons, type LessonSummary } from "../../../lib/api";

export default function LessonsRoute() {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [status, setStatus] = useState("Loading lessons...");

  useEffect(() => {
    let mounted = true;

    fetchLessons()
      .then((items) => {
        if (!mounted) return;
        setLessons(items);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load lessons");
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="SMART Lessons">
      <View style={styles.screen}>
        <ScreenHeader
          title="SMART Lessons"
          description="Follow the weekly lesson plan, review previous topics, and prepare topics for your next coaching chat."
          onBack={() => router.back()}
        />

        {status ? <Text style={styles.statusText}>{status}</Text> : null}

        <ScrollView contentContainerStyle={styles.list}>
          {lessons.map((lesson) => (
            <Card key={lesson.id} title={`Week ${lesson.week}: ${lesson.title}`}>
              <View style={styles.metaRow}>
                <Text style={styles.phaseText}>{formatPhase(lesson.phase)}</Text>
                <Text style={styles.statusPill}>{formatStatus(lesson.status)}</Text>
              </View>
              <Text style={styles.summaryText}>{lesson.summary}</Text>
              <Button
                accessibilityLabel={`Open ${lesson.title}`}
                onPress={() => router.push(`/lessons/${lesson.id}` as never)}
              >
                View Lesson
              </Button>
            </Card>
          ))}
        </ScrollView>
      </View>
    </AppShell>
  );
}

function formatPhase(phase: string) {
  return phase.replaceAll("_", " ");
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 14
  },
  statusText: {
    color: "#334155"
  },
  list: {
    gap: 14,
    paddingBottom: 20
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  phaseText: {
    color: "#475569",
    textTransform: "capitalize",
    fontWeight: "600"
  },
  statusPill: {
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "capitalize",
    fontWeight: "700"
  },
  summaryText: {
    color: "#334155",
    lineHeight: 20
  }
});
