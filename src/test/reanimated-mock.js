// Minimal stand-in for react-native-reanimated in jest. The library's own mock
// (react-native-reanimated/mock) imports the real entry point, whose native initializer throws
// under jest-expo's Android preset (JSReanimated has no setCSSEventHandler, reanimated 4.7). The
// drawer (react-native-drawer-layout) needs only the hooks below; animations finish at once.
const { Animated, FlatList, Image, ScrollView, Text, View } = require("react-native");

const identity = (x) => x;
const finish = (to, _config, callback) => {
  callback?.(true);
  return to;
};

function interpolate(x, input, output) {
  const [i0, i1] = [input[0], input[input.length - 1]];
  const [o0, o1] = [output[0], output[output.length - 1]];
  if (i1 === i0) return o0;
  const t = Math.min(1, Math.max(0, (x - i0) / (i1 - i0)));
  return o0 + t * (o1 - o0);
}

const AnimatedComponents = {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  createAnimatedComponent: identity,
};

const Reanimated = {
  ...AnimatedComponents,
  Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
  ReduceMotion: { System: "system", Always: "always", Never: "never" },
  Easing: Animated.Easing ?? { linear: identity, ease: identity, bezier: () => identity },
  interpolate,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  scheduleOnRN: (fn, ...args) => fn(...args),
  useSharedValue: (value) => ({ value, get: () => value, set: () => {} }),
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedStyle: (fn) => fn(),
  useAnimatedProps: (fn) => fn(),
  useAnimatedReaction: () => {},
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => () => {},
  useEvent: () => () => {},
  useReducedMotion: () => false,
  cancelAnimation: () => {},
  withSpring: finish,
  withTiming: finish,
  withDelay: (_delay, animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withRepeat: identity,
  isSharedValue: (v) => typeof v === "object" && v !== null && "value" in v,
};

module.exports = { ...Reanimated, __esModule: true, default: AnimatedComponents };
