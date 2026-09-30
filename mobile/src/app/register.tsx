import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ServerField } from "../components/ServerField";
import { Banner, Heading, LoadingState, PrimaryButton, Screen, TextField, TextLink, Wordmark } from "../components/ui";
import { space } from "../theme";
import { confirmPasswordError, emailError, passwordError } from "../validators";

export default function RegisterScreen() {
  const { status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [serverEmail, setServerEmail] = useState<string | null>(null);
  const [serverPassword, setServerPassword] = useState<string | null>(null);

  if (status === "loading") return <LoadingState label="Opening PadosiPro" />;
  if (status === "signedIn") return <Redirect href="/" />;

  const emailMessage = submitted ? serverEmail ?? emailError(email) : null;
  const passwordMessage = submitted ? serverPassword ?? passwordError(password) : null;
  const confirmMessage = submitted ? confirmPasswordError(password, confirm) : null;

  async function onSubmit() {
    setSubmitted(true);
    setBanner(null);
    setServerEmail(null);
    setServerPassword(null);
    if (emailError(email) || passwordError(password) || confirmPasswordError(password, confirm)) return;

    setLoading(true);
    try {
      const result = await api.register(email.trim(), password);
      router.push({
        pathname: "/verify",
        params: {
          email: result.data.email,
          expiresAt: result.data.expiresAt,
          resendAvailableAt: result.data.resendAvailableAt,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setServerEmail(error.field("email"));
        setServerPassword(error.field("password"));
        if (!error.field("email") && !error.field("password")) setBanner(error.message);
      } else {
        setBanner("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Wordmark />
      <Heading
        title="A calmer way to get things handled."
        subtitle="You don't manage tasks — we do. Create an account with your email."
      />
      {banner ? <Banner message={banner} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailMessage}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="you@email.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={passwordMessage}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 8 characters"
        hint="Use a letter and a number."
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        error={confirmMessage}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Repeat your password"
      />
      <View style={styles.actions}>
        <PrimaryButton label={loading ? "Creating account…" : "Create account"} onPress={() => void onSubmit()} loading={loading} />
        <TextLink label="Already have an account? Log in" onPress={() => router.push("/login")} />
      </View>
      <ServerField />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.md, marginTop: space.sm },
});
