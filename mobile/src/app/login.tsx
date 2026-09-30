import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ServerField } from "../components/ServerField";
import { Banner, Heading, LoadingState, PrimaryButton, Screen, TextField, TextLink, Wordmark } from "../components/ui";
import { space } from "../theme";
import { emailError } from "../validators";

export default function LoginScreen() {
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const params = useLocalSearchParams<{ verified?: string }>();
  const [banner, setBanner] = useState<string | null>(
    params.verified === "1" ? "Email verified. Log in to continue." : null,
  );
  const [bannerTone, setBannerTone] = useState<"error" | "info">(params.verified === "1" ? "info" : "error");
  const [unverified, setUnverified] = useState(false);

  if (status === "loading") return <LoadingState label="Opening PadosiPro" />;
  if (status === "signedIn") return <Redirect href="/" />;

  async function onSubmit() {
    setSubmitted(true);
    setBanner(null);
    setBannerTone("error");
    setUnverified(false);
    if (emailError(email) || !password) {
      if (!password) setBanner("Password is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(email.trim(), password);
      await signIn(result.data.accessToken, result.data.refreshToken, result.data.user);
      router.replace(result.data.user.profileCompleted ? "/home" : "/profile");
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") {
        setUnverified(true);
        setBanner(error.message);
      } else if (error instanceof ApiError) {
        setBannerTone("error");
        setBanner(error.message);
      } else {
        setBannerTone("error");
        setBanner("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Wordmark />
      <Heading title="Welcome back" subtitle="Log in to pick up where you left off." />
      {banner ? <Banner message={banner} tone={bannerTone} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={submitted ? emailError(email) : null}
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
        error={submitted && !password ? "Password is required." : null}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        placeholder="Your password"
      />
      <View style={styles.actions}>
        <PrimaryButton label={loading ? "Logging in…" : "Log in"} onPress={() => void onSubmit()} loading={loading} />
        {unverified ? (
          <TextLink
            label="Enter verification code"
            onPress={() =>
              router.push({ pathname: "/verify", params: { email: email.trim().toLowerCase(), resend: "1" } })
            }
          />
        ) : null}
        <TextLink label="New here? Create an account" onPress={() => router.push("/register")} />
      </View>
      <ServerField />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.md, marginTop: space.sm },
});
