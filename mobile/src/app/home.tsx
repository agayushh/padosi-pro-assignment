import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Banner, Heading, LoadingState, MessageState, PrimaryButton, Screen, TextLink, Wordmark } from "../components/ui";
import { colors, radius, space } from "../theme";
import type { Selection } from "../types";

export default function HomeScreen() {
  const { status, user, connectionError, signOut, retry } = useAuth();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await api.myTasks();
      setSelection(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not load your tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "signedIn") void load();
  }, [load, status]);

  if (status === "loading") return <LoadingState label="Opening PadosiPro" />;
  if (status === "unreachable") {
    return (
      <MessageState
        title="We cannot reach the server"
        body={connectionError ?? "Check that the API is running, then try again."}
        actionLabel="Try again"
        onAction={() => void retry()}
      />
    );
  }
  if (status !== "signedIn" || !user) return <Redirect href="/login" />;
  if (!user.profileCompleted) return <Redirect href="/profile" />;
  if (loading && !selection) return <LoadingState label="Loading your tasks" />;

  function logout() {
    Alert.alert("Log out?", "You can log in again with the same email.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void signOut().then(() => router.replace("/login")),
      },
    ]);
  }

  const firstName = user.name?.trim().split(/\s+/)[0] || "there";

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load("refresh")}>
      <View style={styles.top}>
        <Wordmark compact />
        <TextLink label="Log out" onPress={logout} />
      </View>
      <Heading
        title={`Hello, ${firstName}`}
        subtitle="Your Lifestyle Manager will take these forward."
      />
      {connectionError ? <Banner message={connectionError} /> : null}
      {error ? <Banner message={error} /> : null}

      <View style={styles.profile}>
        <View style={styles.profileTop}>
          <Text style={styles.profileLabel}>Your details</Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push({ pathname: "/profile", params: { returnTo: "home" } })}
            style={styles.edit}
          >
            <Text style={styles.editLabel}>Edit</Text>
            <Feather name="chevron-right" size={16} color={colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileLine}>{user.mobile}</Text>
        <Text style={styles.profileLine}>{user.address}</Text>
        {user.businessName ? <Text style={styles.profileLine}>{user.businessName}</Text> : null}
      </View>

      {error && !selection ? (
        <PrimaryButton label="Try again" onPress={() => void load()} />
      ) : selection && selection.tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyBody}>Choose what you want handled and we will keep the list here.</Text>
          <PrimaryButton label="Choose tasks" onPress={() => router.push("/tasks")} />
        </View>
      ) : (
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Selected tasks</Text>
            <TextLink label="Change" onPress={() => router.push("/tasks")} />
          </View>
          {selection?.categories.map((category) => (
            <View key={category.id} style={styles.group}>
              <Text style={styles.category}>{category.name}</Text>
              {category.tasks.map((task) => (
                <View key={task.id} style={styles.card}>
                  <Text style={styles.taskName}>{task.name}</Text>
                  <Text style={styles.taskBody}>{task.description}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  profile: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
    marginBottom: space.lg,
  },
  profileTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  profileLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  edit: { flexDirection: "row", alignItems: "center", gap: 2 },
  editLabel: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  profileName: { color: colors.text, fontSize: 18, fontWeight: "700" },
  profileLine: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.sm,
  },
  section: { color: colors.text, fontSize: 18, fontWeight: "700" },
  group: { marginBottom: space.md },
  category: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  taskName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  taskBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  empty: { gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  emptyBody: { color: colors.textSecondary, fontSize: 15, lineHeight: 21, marginBottom: 6 },
});
