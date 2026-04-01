import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { login, logout, register, type LoginRequest } from "./api";

type SessionContextValue = {
  isAuthenticated: boolean;
  userName: string;
  signIn: (request: LoginRequest) => Promise<void>;
  signUp: (request: LoginRequest) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [userName, setUserName] = useState("");

  const value = useMemo<SessionContextValue>(
    () => ({
      isAuthenticated: Boolean(userName),
      userName,
      async signIn(request) {
        const result = await login(request);
        setUserName(result.userName);
      },
      async signUp(request) {
        const result = await register(request);
        setUserName(result.userName);
      },
      signOut() {
        logout();
        setUserName("");
      }
    }),
    [userName]
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
