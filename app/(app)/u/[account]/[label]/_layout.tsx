import { Stack } from "expo-router";
import { t } from "../../../../../src/lib/i18n";

/** A label: its thread list, and threads opened from it on top. */
export default function LabelLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[threadId]" options={{ title: t.thread }} />
    </Stack>
  );
}
