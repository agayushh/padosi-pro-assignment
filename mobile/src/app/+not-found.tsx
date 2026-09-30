import { router } from "expo-router";
import { MessageState } from "../components/ui";

export default function NotFound() {
  return (
    <MessageState
      title="That screen is not here"
      body="Head back and pick up the flow again."
      actionLabel="Go back"
      onAction={() => router.replace("/")}
    />
  );
}
