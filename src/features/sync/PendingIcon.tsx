import { useEffect, useState } from "react";
import { View } from "react-native";
import { Icon } from "react-native-paper";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";

/** How long a pending write-back stays silent (plan 5.7). */
export const PENDING_DELAY_MS = 3000;

/**
 * Clock shown when a thread's operation waits for write-back longer than 3 s (port of silo-web);
 * the typical quick write-back shows nothing. The timer only delays the display: whether the
 * operation is pending is the server's `pendingSync`.
 */
export function PendingIcon({ pending, size = 16 }: { pending: boolean; size?: number }) {
  const theme = useAppTheme();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setShown(true), PENDING_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setShown(false);
    };
  }, [pending]);
  if (!pending || !shown) return null;
  return (
    <View testID="pending-icon" accessible accessibilityLabel={t.pendingSync}>
      <Icon source="clock-outline" size={size} color={theme.colors.onSurfaceVariant} />
    </View>
  );
}
