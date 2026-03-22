import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

type CardProps = PropsWithChildren<{
  title: string;
}>;

export default function Card({ title, children }: CardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a"
  }
});
