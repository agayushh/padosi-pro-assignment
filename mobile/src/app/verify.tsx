import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiError, api } from "../api/client";
import { Banner, Heading, PrimaryButton, Screen, TextField, TextLink, Wordmark } from "../components/ui";
import { colors, space } from "../theme";

function secondsUntil(iso: string | undefined, now: number) {
  if (!iso) return 0;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const resendJobs = new Map<string, Promise<{ message: string; data: { expiresAt: string; resendAvailableAt: string } }>>();

function requestResend(email: string) {
  const existing = resendJobs.get(email);
  if (existing) return existing;
  const job = api.resend(email).finally(() => {
    if (resendJobs.get(email) === job) resendJobs.delete(email);
  });
  resendJobs.set(email, job);
  return job;
}

export default function VerifyScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    expiresAt?: string;
    resendAvailableAt?: string;
    resend?: string;
  }>();
  const email = typeof params.email === "string" ? params.email : "";
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(typeof params.expiresAt === "string" ? params.expiresAt : "");
  const [resendAt, setResendAt] = useState(
    typeof params.resendAvailableAt === "string" ? params.resendAvailableAt : "",
  );
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function applyResend(job: ReturnType<typeof requestResend>) {
    setResending(true);
    setBanner(null);
    try {
      const result = await job;
      setExpiresAt(result.data.expiresAt);
      setResendAt(result.data.resendAvailableAt);
      setInfo(result.message);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.resendAvailableAt) setResendAt(error.resendAvailableAt);
        if (error.expiresAt) setExpiresAt(error.expiresAt);
        if (error.code === "OTP_COOLDOWN") setInfo(error.message);
        else setBanner(error.message);
      } else {
        setBanner("We could not resend the code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  }

  function onResend() {
    if (!email || resending) return;
    void applyResend(requestResend(email));
  }

  useEffect(() => {
    if (params.resend !== "1" || !email) return;
    let cancelled = false;
    setResending(true);
    setBanner(null);
    void requestResend(email)
      .then((result) => {
        if (cancelled) return;
        setExpiresAt(result.data.expiresAt);
        setResendAt(result.data.resendAvailableAt);
        setInfo(result.message);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError) {
          if (error.resendAvailableAt) setResendAt(error.resendAvailableAt);
          if (error.expiresAt) setExpiresAt(error.expiresAt);
          if (error.code === "OTP_COOLDOWN") setInfo(error.message);
          else setBanner(error.message);
        } else {
          setBanner("We could not resend the code. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setResending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email, params.resend]);

  const resendLeft = secondsUntil(resendAt, now);
  const expireLeft = secondsUntil(expiresAt, now);
  const expired = Boolean(expiresAt) && expireLeft === 0;

  async function onVerify() {
    setBanner(null);
    setInfo(null);
    if (!/^\d{6}$/.test(code)) {
      setBanner("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      await api.verify(email, code);
      router.replace({ pathname: "/login", params: { verified: "1" } });
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : "We could not verify that code.");
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <Screen>
        <Wordmark />
        <Heading title="Check your email" subtitle="We need the email address the code was sent to." />
        <PrimaryButton label="Back to create account" onPress={() => router.replace("/register")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Wordmark />
      <Heading title="Check your email" subtitle={`We sent a 6-digit code to ${email}.`} />
      {info ? <Banner tone="info" message={info} /> : null}
      {banner ? <Banner message={banner} /> : null}
      <TextField
        label="6-digit code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="------"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      <Text style={[styles.expiry, expired ? styles.expired : null]}>
        {expiresAt
          ? expired
            ? "This code has expired. Request a new one."
            : `Code expires in ${formatClock(expireLeft)}`
          : "The code expires 10 minutes after it is sent."}
      </Text>
      <View style={styles.actions}>
        <PrimaryButton
          label={loading ? "Verifying…" : "Verify"}
          onPress={() => void onVerify()}
          loading={loading}
          disabled={code.length !== 6}
        />
        <TextLink
          label={
            resending ? "Sending…" : resendLeft > 0 ? `Resend in ${resendLeft}s` : "Resend code"
          }
          onPress={() => {
            if (resendLeft > 0 || resending) return;
            void onResend();
          }}
        />
        <TextLink label="Use a different email" onPress={() => router.replace("/register")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  expiry: { color: colors.textSecondary, fontSize: 14, marginTop: -4, marginBottom: space.md },
  expired: { color: colors.error },
  actions: { gap: space.md },
});
