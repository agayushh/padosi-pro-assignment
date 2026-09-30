import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Banner, Heading, LoadingState, PrimaryButton, Screen, TextField, TextLink, Wordmark } from "../components/ui";
import { space } from "../theme";
import { addressError, businessNameError, mobileError, nameError } from "../validators";

export default function ProfileScreen() {
  const { status, user, refreshUser, signOut } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [name, setName] = useState(user?.name ?? "");
  const [mobile, setMobile] = useState(user?.mobile?.replace(/^\+91/, "") ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [businessName, setBusinessName] = useState(user?.businessName ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  if (status === "loading") return <LoadingState label="Opening PadosiPro" />;
  if (status !== "signedIn" || !user) return <Redirect href="/login" />;

  const firstVisit = !user.profileCompleted;

  async function onSubmit() {
    setSubmitted(true);
    setBanner(null);
    if (nameError(name) || mobileError(mobile) || addressError(address) || businessNameError(businessName)) {
      return;
    }
    setLoading(true);
    try {
      await api.saveProfile({
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        businessName: businessName.trim(),
      });
      await refreshUser();
      router.replace(firstVisit ? "/tasks" : "/home");
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : "We could not save your profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      footer={
        <PrimaryButton
          label={loading ? "Saving…" : firstVisit ? "Continue" : "Save details"}
          onPress={() => void onSubmit()}
          loading={loading}
        />
      }
    >
      <Wordmark />
      <Heading
        step={firstVisit ? "Step 1 of 2" : undefined}
        title="Tell us who you are"
        subtitle="Your Lifestyle Manager uses this to take things forward."
      />
      {banner ? <Banner message={banner} /> : null}
      <TextField
        label="Full name"
        value={name}
        onChangeText={setName}
        error={submitted ? nameError(name) : null}
        autoComplete="name"
        textContentType="name"
        placeholder="As you would like us to use"
      />
      <TextField
        label="Mobile number"
        value={mobile}
        onChangeText={setMobile}
        error={submitted ? mobileError(mobile) : null}
        prefix="+91"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="98765 43210"
      />
      <TextField
        label="Address & area"
        value={address}
        onChangeText={setAddress}
        error={submitted ? addressError(address) : null}
        placeholder="Road, area, landmark"
        multiline
      />
      <TextField
        label="Business name"
        value={businessName}
        onChangeText={setBusinessName}
        error={submitted ? businessNameError(businessName) : null}
        placeholder="Optional"
        hint="Optional. Households can leave this blank. Add it if a business should appear on requests."
      />
      <View style={styles.links}>
        {!firstVisit || returnTo === "home" ? (
          <TextLink label="Back" onPress={() => router.back()} />
        ) : null}
        <TextLink label="Log out" onPress={() => void signOut().then(() => router.replace("/login"))} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: { gap: space.md, marginTop: space.sm },
});
