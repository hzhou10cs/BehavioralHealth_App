import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTutorialTarget } from "./TutorialTarget";

type ScreenHeaderProps = {
  title: string;
  description: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  backTutorialId?: string;
  actionTutorialId?: string;
};

export default function ScreenHeader({
  title,
  description,
  onBack,
  actionLabel,
  onAction,
  backTutorialId,
  actionTutorialId
}: ScreenHeaderProps) {
  const backTutorialTarget = useTutorialTarget(backTutorialId);
  const actionTutorialTarget = useTutorialTarget(actionTutorialId);

  return (
    <View style={styles.screenHeader}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            ref={backTutorialTarget.ref}
            collapsable={backTutorialTarget.collapsable}
            accessibilityLabel="Back"
            accessibilityRole="button"
            onLayout={backTutorialTarget.onLayout}
            onPress={onBack}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}

        {actionLabel && onAction ? (
          <Pressable
            ref={actionTutorialTarget.ref}
            collapsable={actionTutorialTarget.collapsable}
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            onLayout={actionTutorialTarget.onLayout}
            onPress={onAction}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    gap: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 84,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#dbeafe",
    alignItems: "center"
  },
  spacer: {
    width: 72
  },
  buttonText: {
    color: "#1d4ed8",
    fontWeight: "700"
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a"
  },
  description: {
    color: "#475569",
    lineHeight: 20
  }
});
