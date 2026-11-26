// The app's entry: the background notification task first (a process started by a push has no
// screen that would define it), then Expo Router, which renders the app from app/.
import "./src/features/push/background";
import "expo-router/entry";
