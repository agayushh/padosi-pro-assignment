import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { User } from "../types";

const ACCESS = "padosipro.access";
const REFRESH = "padosipro.refresh";
const USER = "padosipro.user";
const API_URL = "padosipro.apiUrl";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storage = {
  getAccess: () => getItem(ACCESS),
  getRefresh: () => getItem(REFRESH),
  getApiUrl: () => getItem(API_URL),
  async setApiUrl(url: string) {
    await setItem(API_URL, url);
  },
  async setSession(accessToken: string, refreshToken: string, user: User) {
    await setItem(ACCESS, accessToken);
    await setItem(REFRESH, refreshToken);
    await setItem(USER, JSON.stringify(user));
  },
  async setUser(user: User) {
    await setItem(USER, JSON.stringify(user));
  },
  async getUser(): Promise<User | null> {
    const raw = await getItem(USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  async clearSession() {
    await deleteItem(ACCESS);
    await deleteItem(REFRESH);
    await deleteItem(USER);
  },
};
