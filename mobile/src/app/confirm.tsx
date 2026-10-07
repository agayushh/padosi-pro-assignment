import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ActionBar, Banner, Heading, LoadingState, MessageState, Screen, Wordmark } from "../components/ui";
import { useDraft } from "../selection/DraftContext";
import { colors, radius, space } from "../theme";

export default function ConfirmScreen() {
  const { status, user, refreshUser } = useAuth();
  const { selected } = useDraft();
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  if (status === "loading") return <LoadingState label="Opening PadosiPro" />;
  if (status !== "signedIn" || !user) return <Redirect href="/login" />;
  if (!user.profileCompleted) return <Redirect href="/profile" />;

  const groups = new Map<string, typeof selected>();
  for (const task of selected) {
    const list = groups.get(task.categoryName) ?? [];
    list.push(task);
    groups.set(task.categoryName, list);
  }

  async function onConfirm() {
    setBanner(null);
    setLoading(true);
    try {
      await api.saveTasks(selected.map((task) => task.id));
      await refreshUser();
      router.replace("/home");
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : "We could not save your tasks.");
    } finally {
      setLoading(false);
    }
  }

  if (selected.length === 0) {
    return (
      <MessageState
        title="No tasks selected"
        body="Pick at least one task for your Lifestyle Manager."
        actionLabel="Choose tasks"
        onAction={() => router.replace("/tasks")}
      />
    );
  }

  return (
    <Screen
      footer={
        <ActionBar
          caption={selected.length === 1 ? "1 task ready" : `${selected.length} tasks ready`}
          label={loading ? "Saving…" : "Confirm"}
          onPress={() => void onConfirm()}
          loading={loading}
          secondaryLabel="Edit"
          onSecondary={() => router.back()}
        />
      }
    >
      <Wordmark />
      <Heading
        title="Does this look right?"
        subtitle="Your Lifestyle Manager will take these forward."
      />
      {banner ? <Banner message={banner} /> : null}
      {[...groups.entries()].map(([category, tasks]) => (
        <View key={category} style={styles.group}>
          <Text style={styles.category}>{category}</Text>
          {tasks.map((task) => (
            <View key={task.id} style={styles.card}>
              <Text style={styles.name}>{task.name}</Text>
              <Text style={styles.body}>{task.description}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
});
