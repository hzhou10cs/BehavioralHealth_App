import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useTutorialTarget } from "./TutorialTarget";

type InputProps = TextInputProps & {
  label: string;
  tutorialId?: string;
};

export default function Input({ label, tutorialId, ...props }: InputProps) {
  const accessibilityLabel = useMemo(() => props.accessibilityLabel ?? label, [props.accessibilityLabel, label]);
  const tutorialTarget = useTutorialTarget(tutorialId);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={tutorialTarget.ref}
        collapsable={tutorialTarget.collapsable}
        accessibilityLabel={accessibilityLabel}
        onLayout={tutorialTarget.onLayout}
        placeholderTextColor="#94a3b8"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  label: {
    fontWeight: "600",
    color: "#334155"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#ffffff"
  }
});
