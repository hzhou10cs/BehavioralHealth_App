import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../../components/AppShell";
import Card from "../../../components/Card";
import ScreenHeader from "../../../components/ScreenHeader";
import { fetchLesson, type LessonDetail } from "../../../lib/api";

export default function LessonDetailRoute() {
  const params = useLocalSearchParams<{ lessonId?: string }>();
  const lessonId = typeof params.lessonId === "string" ? params.lessonId : "";
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [status, setStatus] = useState("Loading lesson...");

  useEffect(() => {
    if (!lessonId) {
      setStatus("Lesson not found");
      return;
    }

    let mounted = true;

    fetchLesson(lessonId)
      .then((item) => {
        if (!mounted) return;
        setLesson(item);
        setStatus("");
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load lesson");
      });

    return () => {
      mounted = false;
    };
  }, [lessonId]);

  return (
    <AppShell title="Lesson Detail">
      <View style={styles.screen}>
        <ScreenHeader
          title={lesson ? `Week ${lesson.week}: ${lesson.title}` : "Lesson Detail"}
          description={
            lesson
              ? "Read the key ideas for this week and bring them into your chat or action plan."
              : "Open a lesson to view its summary, key ideas, and activity."
          }
          onBack={() => router.back()}
        />

        {status ? <Text style={styles.statusText}>{status}</Text> : null}

        {lesson ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Card title="Overview">
              <Text style={styles.summaryText}>{lesson.summary}</Text>
              <Text style={styles.metaText}>
                Phase: {lesson.phase.replaceAll("_", " ")} | Status:{" "}
                {lesson.status.replaceAll("_", " ")}
              </Text>
            </Card>

            <Card title="Objectives">
              {lesson.objectives.map((objective) => (
                <Text key={objective} style={styles.bulletText}>
                  - {objective}
                </Text>
              ))}
            </Card>

            {lesson.sections.map((section) => (
              <Card key={section.title} title={section.title}>
                {section.content ? <Text style={styles.bodyText}>{section.content}</Text> : null}
                {section.items.map((item) => (
                  <Text key={item} style={styles.bulletText}>
                    - {item}
                  </Text>
                ))}
              </Card>
            ))}

            {lesson.activity ? (
              <Card title={lesson.activity.title}>
                <Text style={styles.bodyText}>{lesson.activity.prompt}</Text>
                {lesson.activity.fields.map((field) => (
                  <View key={field.id} style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    {field.placeholder ? (
                      <Text style={styles.fieldHint}>{field.placeholder}</Text>
                    ) : null}
                  </View>
                ))}
              </Card>
            ) : null}
          </ScrollView>
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
  statusText: {
    color: "#334155"
  },
  content: {
    gap: 14,
    paddingBottom: 20
  },
  summaryText: {
    color: "#334155",
    lineHeight: 20
  },
  metaText: {
    color: "#475569",
    textTransform: "capitalize"
  },
  bodyText: {
    color: "#334155",
    lineHeight: 20
  },
  bulletText: {
    color: "#334155",
    lineHeight: 20
  },
  fieldBlock: {
    gap: 4,
    paddingVertical: 4
  },
  fieldLabel: {
    color: "#0f172a",
    fontWeight: "700"
  },
  fieldHint: {
    color: "#64748b"
  }
});
