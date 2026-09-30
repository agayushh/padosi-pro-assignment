import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../auth/AuthContext";
import { DraftProvider } from "../selection/DraftContext";
import { colors } from "../theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DraftProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          />
        </DraftProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
