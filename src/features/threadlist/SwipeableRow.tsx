import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { Icon } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { ThreadAction } from "./actions";

/** Share of the row width a swipe must pass to trigger its action (Gmail's full swipe). */
export const SWIPE_THRESHOLD = 0.4;
/**
 * Width of the drawer's edge swipe (AccountLayout's swipeEdgeWidth): a pan starting there opens
 * the drawer, not a row swipe.
 */
const DRAWER_EDGE = 32;
/** Horizontal travel before a row swipe starts, and vertical travel that hands over to scroll. */
const ACTIVE_X = 16;
const FAIL_Y = 12;

/** Background of a swipe as in the Gmail app: green archive, red delete, blue snooze. */
export function swipeLook(action: ThreadAction): { color: string; icon: string } {
  switch (action) {
    case "archive":
      return { color: "#188038", icon: "archive-outline" };
    case "trash":
      return { color: "#d93025", icon: "delete-outline" };
    case "snooze":
    case "unsnooze":
      return { color: "#1a73e8", icon: "clock-outline" };
    default:
      return { color: "#5f6368", icon: "email-outline" };
  }
}

type Props = {
  /** Action of a swipe to the left (background revealed on the right); null: no swipe. */
  left: ThreadAction | null;
  /** Action of a swipe to the right (background revealed on the left); null: no swipe. */
  right: ThreadAction | null;
  enabled: boolean;
  onSwipe: (action: ThreadAction) => void;
  children: ReactNode;
};

function haptic() {
  // Optional feedback; a device without a vibrator rejects, which is fine.
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/**
 * A row that follows a horizontal pan and, released past the threshold, slides out and triggers
 * its action (a custom pan on gesture-handler 3 and reanimated: the library's Swipeable reveals
 * buttons rather than doing Gmail's full swipe). The pan activates only after 16 dp of
 * horizontal travel and fails after 12 dp of vertical travel, so the list keeps scrolling, and it
 * ignores touches starting in the drawer's 32 dp edge.
 */
export function SwipeableRow({ left, right, enabled, onSwipe, children }: Props) {
  const width = useSharedValue(0);
  const tx = useSharedValue(0);
  const armed = useSharedValue(0);

  const fire = (direction: number) => {
    const action = direction < 0 ? left : right;
    if (action) onSwipe(action);
    // The list drops the row once the action is applied (slice 4); until then it comes back.
    tx.value = withTiming(0, { duration: 200 });
  };

  const pan = usePanGesture({
    enabled: enabled && (!!left || !!right),
    activeOffsetX: [-ACTIVE_X, ACTIVE_X],
    failOffsetY: [-FAIL_Y, FAIL_Y],
    hitSlop: { left: -DRAWER_EDGE },
    onUpdate: (e) => {
      let x = e.translationX;
      if ((x < 0 && !left) || (x > 0 && !right)) x = 0;
      tx.value = x;
      const over =
        width.value > 0 && Math.abs(x) > width.value * SWIPE_THRESHOLD ? Math.sign(x) : 0;
      if (over !== armed.value) {
        armed.value = over;
        if (over !== 0) scheduleOnRN(haptic);
      }
    },
    onDeactivate: () => {
      const direction = armed.value;
      armed.value = 0;
      if (direction === 0) {
        tx.value = withSpring(0);
        return;
      }
      tx.value = withTiming(direction * width.value, { duration: 160 }, () => {
        scheduleOnRN(fire, direction);
      });
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const rightBg = useAnimatedStyle(() => ({ opacity: tx.value > 0 ? 1 : 0 }));
  const leftBg = useAnimatedStyle(() => ({ opacity: tx.value < 0 ? 1 : 0 }));

  return (
    <View onLayout={(e) => (width.value = e.nativeEvent.layout.width)}>
      {right && <Background action={right} side="left" style={rightBg} />}
      {left && <Background action={left} side="right" style={leftBg} />}
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

type BackgroundProps = {
  action: ThreadAction;
  /** Side of the row the icon sits on. */
  side: "left" | "right";
  style: ReturnType<typeof useAnimatedStyle>;
};

function Background({ action, side, style }: BackgroundProps) {
  const look = swipeLook(action);
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        styles.background,
        {
          backgroundColor: look.color,
          justifyContent: side === "left" ? "flex-start" : "flex-end",
        },
        style,
      ]}
    >
      <Icon source={look.icon} size={24} color="#ffffff" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  background: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24 },
});
