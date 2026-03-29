import { Pressable, StyleSheet, Text, View } from "react-native";

type ScreenHeaderProps = {
  title: string;
  description: string;
  onBack?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export default function ScreenHeader({
  title,
  description,
  onBack,
  actionLabel,
  onAction
}: ScreenHeaderProps) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
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
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
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
    borderRadius: 999,
    backgroundColor: "#dbeafe"
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
