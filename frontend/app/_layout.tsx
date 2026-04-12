import { Stack } from "expo-router";
import TutorialOverlay from "../components/TutorialOverlay";
import { TutorialLayoutProvider } from "../components/TutorialLayoutContext";
import { SessionProvider } from "../lib/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <TutorialLayoutProvider style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
        <TutorialOverlay />
      </TutorialLayoutProvider>
    </SessionProvider>
  );
}
