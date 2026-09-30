import { Feather } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Heading, LoadingState, MessageState, PrimaryButton, Screen, TextLink, Wordmark } from "../components/ui";
import { useDraft } from "../selection/DraftContext";
import { colors, radius, space } from "../theme";
import type { Category, SelectedTask } from "../types";

export default function TasksScreen() {
  const { status, user, signOut } = useAuth();
  const { selected, toggle, replace } = useDraft();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const initialized = useRef(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [catalogue, mine] = await Promise.all([api.tasks(), api.myTasks()]);
      setCategories(catalogue.data.categories);
      if (!initialized.current) {
        replace(mine.data.tasks);
        initialized.current = true;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "signedIn") void load();
  }, [status]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (categories ?? [])
      .map((category) => ({
        ...category,
        tasks: category.tasks.filter(
          (task) =>
            !q ||
            task.name.toLowerCase().includes(q) ||
            task.description.toLowerCase().includes(q) ||
            category.name.toLowerCase().includes(q),
        ),
      }))
      .filter((category) => category.tasks.length > 0);
  }, [categories, query]);

  if (status === "loading" || (status === "signedIn" && loading && !categories)) {
    return <LoadingState label="Loading tasks" />;
  }
  if (status !== "signedIn" || !user) return <Redirect href="/login" />;
  if (!user.profileCompleted) return <Redirect href="/profile" />;
  if (error && !categories) {
    return (
      <MessageState
        title="Tasks did not load"
        body={error}
        actionLabel="Try again"
        onAction={() => void load()}
      />
    );
  }

  const selectedIds = new Set(selected.map((task) => task.id));

  return (
    <Screen
      footer={
        <PrimaryButton
          label={selected.length === 0 ? "Pick at least one task" : `Continue · ${selected.length} selected`}
          disabled={selected.length === 0}
          onPress={() => router.push("/confirm")}
        />
      }
    >
      <View style={styles.top}>
        <Wordmark compact />
        <TextLink
          label="Log out"
          onPress={() => {
            Alert.alert("Log out?", "You can log in again with the same email.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Log out",
                style: "destructive",
                onPress: () => void signOut().then(() => router.replace("/login")),
              },
            ]);
          }}
        />
      </View>
      <Heading
        step={user.selectedTaskCount === 0 ? "Step 2 of 2" : undefined}
        title="What should we help manage?"
        subtitle="Pick any that apply. You can change this whenever."
      />
      <View style={styles.search}>
        <Feather name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tasks"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
            <Feather name="x" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tasks match that search.</Text>
          <Text style={styles.emptyBody}>Try a category, like home, travel, or senior care.</Text>
        </View>
      ) : (
        visible.map((category) => (
          <View key={category.id} style={styles.group}>
            <Text style={styles.category}>{category.name}</Text>
            <Text style={styles.categoryBody}>{category.description}</Text>
            {category.tasks.map((task) => {
              const picked = selectedIds.has(task.id);
              const draft: SelectedTask = { ...task, categoryName: category.name };
              return (
                <Pressable
                  key={task.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: picked }}
                  onPress={() => toggle(draft)}
                  style={[styles.row, picked ? styles.rowSelected : null]}
                >
                  <View style={[styles.box, picked ? styles.boxSelected : null]}>
                    {picked ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.taskName}>{task.name}</Text>
                    <Text style={styles.taskBody}>{task.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: space.lg,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 },
  empty: { paddingVertical: space.lg, gap: 6 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  emptyBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  group: { marginBottom: space.lg },
  category: { color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  categoryBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 10 },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.mint },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    backgroundColor: colors.surface,
  },
  boxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  rowText: { flex: 1 },
  taskName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  taskBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
});
