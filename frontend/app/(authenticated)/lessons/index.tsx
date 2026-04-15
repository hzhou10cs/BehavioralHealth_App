import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../../components/AppShell";
import Button from "../../../components/Button";
import Card from "../../../components/Card";
import ScreenHeader from "../../../components/ScreenHeader";
import { useSession } from "../../../lib/session";
import { TUTORIAL_OVERLAY_SPACE } from "../../../lib/tutorial";
import { fetchLessons, type LessonSummary } from "../../../lib/api";

export default function LessonsRoute() {
  const { tutorialRequired } = useSession();
  const isFocused = useIsFocused();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [status, setStatus] = useState("Loading lessons...");

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let mounted = true;
    setStatus("Loading lessons...");

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
  }, [isFocused]);

  return (
    <AppShell title="SMART Lessons">
      <View style={styles.screen}>
        <ScreenHeader
          title="SMART Lessons"
          description="Follow the lesson plan in order. Finish each lesson to unlock the next one."
          onBack={() => router.back()}
          backTutorialId="shared-back"
        />

        {status ? <Text style={styles.statusText}>{status}</Text> : null}

        <ScrollView
          contentContainerStyle={[
            styles.list,
            tutorialRequired && styles.tutorialList
          ]}
        >
          {lessons.map((lesson, index) => (
            <Card key={lesson.id} title={`Lesson ${lesson.week}: ${lesson.title}`}>
              <View style={styles.metaRow}>
                <Text style={styles.phaseText}>{formatPhase(lesson.phase)}</Text>
                <Text
                  style={[
                    styles.statusPill,
                    lesson.status === "locked" && styles.lockedStatusPill,
                    lesson.status === "completed" && styles.completedStatusPill
                  ]}
                >
                  {formatStatus(lesson.status)}
                </Text>
              </View>
              <Text style={styles.summaryText}>{lesson.summary}</Text>
              {lesson.status === "locked" ? (
                <Text style={styles.lockedCopy}>
                  Finish the previous lesson to unlock this one.
                </Text>
              ) : null}
              <Button
                accessibilityLabel={
                  lesson.status === "locked"
                    ? `${lesson.title} is locked`
                    : `Open ${lesson.title}`
                }
                tutorialId={index === 0 ? "lessons-view-first" : undefined}
                disabled={lesson.status === "locked"}
                onPress={() => {
                  if (lesson.status === "locked") {
                    return;
                  }
                  router.push(`/lessons/${lesson.id}` as never);
                }}
              >
                {lesson.status === "completed" ? "Review Lesson" : "View Lesson"}
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
  tutorialList: {
    paddingBottom: TUTORIAL_OVERLAY_SPACE + 20
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
  completedStatusPill: {
    color: "#166534",
    backgroundColor: "#dcfce7"
  },
  lockedStatusPill: {
    color: "#9f1239",
    backgroundColor: "#ffe4e6"
  },
  summaryText: {
    color: "#334155",
    lineHeight: 20
  },
  lockedCopy: {
    color: "#7f1d1d",
    lineHeight: 20
  }
});
