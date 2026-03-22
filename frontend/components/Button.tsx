import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}>;

export default function Button({
  children,
  onPress,
  disabled = false,
  accessibilityLabel
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
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
