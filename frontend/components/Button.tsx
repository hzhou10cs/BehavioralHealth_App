import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTutorialTarget } from "./TutorialTarget";

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  tutorialId?: string;
}>;

export default function Button({
  children,
  onPress,
  disabled = false,
  accessibilityLabel,
  tutorialId
}: ButtonProps) {
  const tutorialTarget = useTutorialTarget(tutorialId);

  return (
    <Pressable
      ref={tutorialTarget.ref}
      collapsable={tutorialTarget.collapsable}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onLayout={tutorialTarget.onLayout}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton
      ]}
    >
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center"
  },
  pressedButton: {
    opacity: 0.86
  },
  disabledButton: {
    backgroundColor: "#93c5fd"
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16
  }
});
