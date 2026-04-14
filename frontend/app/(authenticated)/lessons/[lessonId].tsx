import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../../components/AppShell";
import Button from "../../../components/Button";
import Card from "../../../components/Card";
import ScreenHeader from "../../../components/ScreenHeader";
import { useSession } from "../../../lib/session";
import { TUTORIAL_OVERLAY_SPACE } from "../../../lib/tutorial";
import { completeLesson, fetchLesson, type LessonDetail } from "../../../lib/api";

export default function LessonDetailRoute() {
  const { tutorialRequired } = useSession();
  const params = useLocalSearchParams<{ lessonId?: string }>();
  const lessonId = typeof params.lessonId === "string" ? params.lessonId : "";
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [status, setStatus] = useState("Loading lesson...");
  const [completing, setCompleting] = useState(false);

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

  async function handleFinishLesson() {
    if (!lesson || lesson.status === "completed") {
      return;
    }

    try {
      setCompleting(true);
      setStatus("Finishing lesson...");
      const completedLesson = await completeLesson(lesson.id);
      setLesson(completedLesson);
      setStatus("Lesson completed. Use Back to return to the lesson list.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not finish lesson");
    } finally {
      setCompleting(false);
    }
  }

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
          backTutorialId="lesson-detail-back"
        />

        {status ? <Text style={styles.statusText}>{status}</Text> : null}

        {lesson ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              tutorialRequired && styles.tutorialContent
            ]}
          >
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

            <Card title="Progress">
              <Text style={styles.bodyText}>
                {lesson.status === "completed"
                  ? "You have already completed this lesson."
                  : "Finish this lesson to unlock the next lesson in the plan."}
              </Text>
              <Button
                accessibilityLabel={
                  lesson.status === "completed" ? "Lesson Completed" : "Finish Lesson"
                }
                disabled={lesson.status === "completed" || completing}
                onPress={handleFinishLesson}
              >
                {lesson.status === "completed"
                  ? "Lesson Completed"
                  : completing
                    ? "Finishing..."
                    : "Finish Lesson"}
              </Button>
            </Card>
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
  tutorialContent: {
    paddingBottom: TUTORIAL_OVERLAY_SPACE + 20
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
