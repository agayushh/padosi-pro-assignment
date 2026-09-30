import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, setSessionLostHandler } from "../api/client";
import { setApiUrlOverride } from "../api/config";
import type { User } from "../types";
import { storage } from "./storage";

type Status = "loading" | "signedOut" | "signedIn" | "unreachable";

type AuthValue = {
  status: Status;
  user: User | null;
  connectionError: string | null;
  signIn: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User>;
  retry: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    setConnectionError(null);
    const savedUrl = await storage.getApiUrl();
    if (savedUrl) setApiUrlOverride(savedUrl);

    const refresh = await storage.getRefresh();
    if (!refresh) {
      setUser(null);
      setStatus("signedOut");
      return;
    }

    try {
      const result = await api.me();
      setUser(result.data);
      await storage.setUser(result.data);
      setStatus("signedIn");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await storage.clearSession();
        setUser(null);
        setStatus("signedOut");
        return;
      }
      const cached = await storage.getUser();
      const message = error instanceof Error ? error.message : "We could not reach PadosiPro.";
      if (cached) {
        setUser(cached);
        setConnectionError(message);
        setStatus("signedIn");
        return;
      }
      setUser(null);
      setConnectionError(message);
      setStatus("unreachable");
    }
  }, []);

  useEffect(() => {
    setSessionLostHandler(() => {
      void storage.clearSession();
      setUser(null);
      setConnectionError(null);
      setStatus("signedOut");
    });
    void bootstrap();
    return () => setSessionLostHandler(null);
  }, [bootstrap]);

  const signIn = useCallback(async (accessToken: string, refreshToken: string, nextUser: User) => {
    await storage.setSession(accessToken, refreshToken, nextUser);
    setUser(nextUser);
    setConnectionError(null);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    const refresh = await storage.getRefresh();
    if (refresh) {
      try {
        await api.logout(refresh);
      } catch {
        // Local logout still stands if the network call fails.
      }
    }
    await storage.clearSession();
    setUser(null);
    setConnectionError(null);
    setStatus("signedOut");
  }, []);

  const refreshUser = useCallback(async () => {
    const result = await api.me();
    setUser(result.data);
    await storage.setUser(result.data);
    setConnectionError(null);
    setStatus("signedIn");
    return result.data;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ status, user, connectionError, signIn, signOut, refreshUser, retry: bootstrap }),
    [status, user, connectionError, signIn, signOut, refreshUser, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
