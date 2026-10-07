import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { apiUrl, setApiUrlOverride } from "../api/config";
import { storage } from "../auth/storage";
import { colors, radius, space } from "../theme";
import { useScrollFieldIntoView } from "./ui";

export function ServerField() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(apiUrl());
  const [saved, setSaved] = useState(false);
  const reveal = useScrollFieldIntoView();

  async function save() {
    const next = value.trim().replace(/\/$/, "");
    if (!/^https?:\/\/.+/i.test(next)) return;
    setApiUrlOverride(next);
    await storage.setApiUrl(next);
    setSaved(true);
    setOpen(false);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.meta}>API · {apiUrl()}</Text>
      <Pressable onPress={() => setOpen((current) => !current)} hitSlop={8}>
        <Text style={styles.link}>{open ? "Close" : "Change server"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.row}>
          <TextInput
            value={value}
            onChangeText={(text) => {
              setSaved(false);
              setValue(text);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.1.10:3001"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            autoFocus
            onFocus={reveal}
          />
          <Pressable style={styles.save} onPress={() => void save()}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      ) : null}
      {saved ? <Text style={styles.saved}>Server updated.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.lg, gap: 8 },
  meta: { color: colors.textSecondary, fontSize: 12, textAlign: "center" },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600", textAlign: "center" },
  row: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.text,
  },
  save: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontWeight: "700" },
  saved: { color: colors.success, fontSize: 12, textAlign: "center" },
});
