import { Stack } from "expo-router";
import { t } from "../../../../../src/lib/i18n";

/** Search: the field with suggestions and results, and threads opened from the results on top. */
export default function SearchLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[threadId]" options={{ title: t.thread, headerShown: false }} />
    </Stack>
  );
}
