import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

type AppShellProps = PropsWithChildren<{
  title: string;
  keyboardAware?: boolean;
}>;

export default function AppShell({
  title,
  keyboardAware = false,
  children
}: AppShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.shellHeader}>
            <Text style={styles.appHeading}>BehavioralHealth App</Text>
            <Text style={styles.subHeading}>{title}</Text>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9"
  },
  flex: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 18
  },
  shellHeader: {
    gap: 4
  },
  appHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a"
  },
  subHeading: {
    color: "#475569"
  }
});
