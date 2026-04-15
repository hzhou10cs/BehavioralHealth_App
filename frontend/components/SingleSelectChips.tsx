import { Pressable, StyleSheet, Text, View } from "react-native";

type SingleSelectChipsProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
};

export default function SingleSelectChips({
  label,
  value,
  options,
  onChange,
}: SingleSelectChipsProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${option}`}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontWeight: "600",
    color: "#334155",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#782F40",
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  optionSelected: {
    borderColor: "#782F40",
    backgroundColor: "#782F40",
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    color: "#782F40",
    textTransform: "capitalize",
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#ffffff",
  },
});
