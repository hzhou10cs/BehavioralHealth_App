import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import {
  completeTutorial,
  login,
  logout,
  register,
  type LoginRequest,
  type RegisterRequest
} from "./api";
import { TUTORIAL_STEPS } from "./tutorial";

type SessionContextValue = {
  isAuthenticated: boolean;
  userName: string;
  tutorialRequired: boolean;
  tutorialStepIndex: number | null;
  activeTutorialTargetId: string | null;
  signIn: (request: LoginRequest) => Promise<boolean>;
  signUp: (request: RegisterRequest) => Promise<boolean>;
  setTutorialStepIndex: (index: number | null) => void;
  beginTutorial: () => void;
  finishTutorial: () => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [userName, setUserName] = useState("");
  const [tutorialRequired, setTutorialRequired] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState<number | null>(null);
  const activeTutorialTargetId =
    tutorialStepIndex !== null ? TUTORIAL_STEPS[tutorialStepIndex]?.targetId ?? null : null;

  const value = useMemo<SessionContextValue>(
    () => ({
      isAuthenticated: Boolean(userName),
      userName,
      tutorialRequired,
      tutorialStepIndex,
      activeTutorialTargetId,
      async signIn(request) {
        const result = await login(request);
        setUserName(result.userName);
        setTutorialRequired(result.tutorialRequired);
        setTutorialStepIndex(result.tutorialRequired ? 0 : null);
        return result.tutorialRequired;
      },
      async signUp(request) {
        const result = await register(request);
        setUserName(result.userName);
        setTutorialRequired(result.tutorialRequired);
        setTutorialStepIndex(result.tutorialRequired ? 0 : null);
        return result.tutorialRequired;
      },
      setTutorialStepIndex,
      beginTutorial() {
        setTutorialRequired(true);
        setTutorialStepIndex(0);
      },
      async finishTutorial() {
        await completeTutorial();
        setTutorialRequired(false);
        setTutorialStepIndex(null);
      },
      signOut() {
        logout();
        setUserName("");
        setTutorialRequired(false);
        setTutorialStepIndex(null);
      }
    }),
    [activeTutorialTargetId, tutorialRequired, tutorialStepIndex, userName]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
