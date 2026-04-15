import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import TutorialTarget from "./TutorialTarget";

type CardProps = PropsWithChildren<{
  title: string;
  tutorialId?: string;
}>;

export default function Card({ title, tutorialId, children }: CardProps) {
  return (
    <View style={styles.card}>
      <TutorialTarget tutorialId={tutorialId} style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
      </TutorialTarget>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10
  },
  titleWrap: {
    alignSelf: "flex-start"
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a"
  }
});
