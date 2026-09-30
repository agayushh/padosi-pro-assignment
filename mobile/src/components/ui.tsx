import { Feather } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, space } from "../theme";

export function Screen({
  children,
  footer,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.wordmark, compact ? styles.wordmarkCompact : null]}>
      <Text style={styles.brand}>PADOSIPRO</Text>
      <View style={styles.goldRule} />
    </View>
  );
}

export function Heading({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle?: string;
  step?: string;
}) {
  return (
    <View style={styles.heading}>
      {step ? <Text style={styles.step}>{step}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function TextField({
  label,
  error,
  hint,
  prefix,
  secureTextEntry,
  ...input
}: TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  prefix?: string;
}) {
  const [hidden, setHidden] = useState(true);
  const isSecure = secureTextEntry === true;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, input.multiline ? styles.multiline : null]}
          secureTextEntry={isSecure ? hidden : false}
          {...input}
        />
        {isSecure ? (
          <Pressable accessibilityLabel={hidden ? "Show password" : "Hide password"} onPress={() => setHidden((value) => !value)} hitSlop={8}>
            <Feather name={hidden ? "eye" : "eye-off"} size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !inactive ? styles.buttonPressed : null,
        inactive ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ message, tone = "error" }: { message: string; tone?: "error" | "info" }) {
  return (
    <View style={[styles.banner, tone === "info" ? styles.bannerInfo : styles.bannerError]}>
      <Feather
        name={tone === "info" ? "info" : "alert-circle"}
        size={16}
        color={tone === "info" ? colors.primary : colors.error}
      />
      <Text style={[styles.bannerText, tone === "info" ? styles.bannerTextInfo : null]}>{message}</Text>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <SafeAreaView style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.centerTitle}>{label}</Text>
    </SafeAreaView>
  );
}

export function MessageState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView style={styles.centered}>
      <Text style={styles.centerTitle}>{title}</Text>
      <Text style={styles.centerBody}>{body}</Text>
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl, flexGrow: 1 },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  wordmark: { marginBottom: space.lg },
  wordmarkCompact: { marginBottom: 0 },
  brand: { color: colors.primary, fontSize: 13, fontWeight: "700", letterSpacing: 2.4 },
  goldRule: { marginTop: 8, width: 36, height: 3, borderRadius: 2, backgroundColor: colors.gold },
  heading: { marginBottom: space.lg, gap: 8 },
  step: { color: colors.gold, fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },
  title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, fontSize: 16, lineHeight: 23 },
  field: { marginBottom: space.md },
  label: { color: colors.text, fontSize: 14, fontWeight: "600", marginBottom: 8 },
  inputRow: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputError: { borderColor: colors.error },
  prefix: { color: colors.text, fontSize: 16, fontWeight: "600" },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  errorText: { color: colors.error, fontSize: 13, lineHeight: 18, marginTop: 6 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6 },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  link: { color: colors.primary, fontSize: 15, fontWeight: "600", textAlign: "center" },
  banner: {
    borderRadius: radius.md,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: space.md,
  },
  bannerError: { backgroundColor: colors.errorBg },
  bannerInfo: { backgroundColor: colors.mint },
  bannerText: { flex: 1, color: colors.error, fontSize: 14, lineHeight: 20 },
  bannerTextInfo: { color: colors.primary },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: 12,
  },
  centerTitle: { color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" },
  centerBody: { color: colors.textSecondary, fontSize: 16, lineHeight: 22, textAlign: "center", marginBottom: 8 },
});
