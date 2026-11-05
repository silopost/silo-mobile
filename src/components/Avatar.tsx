import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { avatarColor, initial } from "../lib/format";

type Props = {
  address: { email: string; name?: string | null };
  size?: number;
};

/** Circle with the first letter of the name, in a colour fixed per address (port of silo-web). */
export function Avatar({ address, size = 32 }: Props) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarColor(address.email),
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.45 }]}>{initial(address)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  letter: { color: "#ffffff", fontWeight: "500" },
});
