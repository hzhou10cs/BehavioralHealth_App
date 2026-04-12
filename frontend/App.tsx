import { ExpoRoot, type RequireContext } from "expo-router";
import { getMockContext } from "expo-router/build/testing-library/mock-config";
import { TutorialLayoutProvider } from "./components/TutorialLayoutContext";
import { SessionProvider } from "./lib/session";

// Jest renders this wrapper directly; the native app now boots from expo-router/entry.
const testRouteContext = getMockContext("./app") as RequireContext;

export default function App() {
  return (
    <SessionProvider>
      <TutorialLayoutProvider style={{ flex: 1 }}>
        <ExpoRoot context={testRouteContext} />
      </TutorialLayoutProvider>
    </SessionProvider>
  );
}
