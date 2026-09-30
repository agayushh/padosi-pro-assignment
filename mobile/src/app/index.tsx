import { Redirect } from "expo-router";
import { LoadingState, MessageState } from "../components/ui";
import { useAuth } from "../auth/AuthContext";

export default function Index() {
  const { status, user, connectionError, retry } = useAuth();

  if (status === "loading") {
    return <LoadingState label="Opening PadosiPro" />;
  }

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

  if (status === "signedOut" || !user) {
    return <Redirect href="/register" />;
  }

  if (!user.profileCompleted) {
    return <Redirect href="/profile" />;
  }

  return <Redirect href="/home" />;
}
