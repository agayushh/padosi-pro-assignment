import Constants from "expo-constants";
import { Platform } from "react-native";

let override: string | null = null;

export function setApiUrlOverride(url: string | null) {
  override = url ? url.replace(/\/$/, "") : null;
}

export function apiUrl(): string {
  if (override) return override;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const raw = Constants.expoGoConfig?.debuggerHost || Constants.expoConfig?.hostUri;
  const host = raw?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3001`;
  }
  if (Platform.OS === "android") return "http://10.0.2.2:3001";
  return "http://localhost:3001";
}
