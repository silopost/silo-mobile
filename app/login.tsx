import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { LoginScreen } from "../src/screens/LoginScreen";
import { useAuth } from "../src/state/auth";

export default function Login() {
  const status = useAuth((s) => s.status);
  const theme = useTheme();
  if (status === "signedIn") return <Redirect href="/" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LoginScreen />
    </SafeAreaView>
  );
}
