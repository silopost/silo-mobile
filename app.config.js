const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

/*
 * App config (read by `expo start`, `expo export`, `expo prebuild`). Push notifications need two
 * values of the publisher's own Firebase and Expo projects, passed as environment variables so no
 * credentials live in the repository (README, "Push notifications"):
 *
 * - SILO_GOOGLE_SERVICES_JSON: path to google-services.json (Firebase Cloud Messaging on Android),
 * - SILO_EAS_PROJECT_ID: the Expo project id that Expo push tokens are issued for.
 *
 * Without them the app builds and runs as before; the notifications setting says the build has no
 * push configuration (src/features/push/config.ts reads `extra`).
 */
/** @param {string} name */
function env(name) {
  return process.env[name]?.trim() || undefined;
}

function googleServicesFile() {
  const value = env("SILO_GOOGLE_SERVICES_JSON");
  if (!value) return undefined;
  const file = resolve(value);
  if (!existsSync(file)) {
    throw new Error(`SILO_GOOGLE_SERVICES_JSON points to a missing file: ${file}`);
  }
  return file;
}

const googleServices = googleServicesFile();
const projectId = env("SILO_EAS_PROJECT_ID");

/** @type {import("expo/config").ExpoConfig} */
const config = {
  name: "Silo",
  slug: "silo-mobile",
  version: "0.1.0",
  scheme: "silopost",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "dev.silopost.mobile",
  },
  android: {
    package: "dev.silopost.mobile",
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    ...(googleServices && { googleServicesFile: googleServices }),
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sharing",
    "expo-web-browser",
    "@react-native-community/datetimepicker",
    [
      "expo-notifications",
      {
        // Small status-bar icon (alpha only) and its tint; the server always names the channel.
        icon: "./assets/android-icon-monochrome.png",
        color: "#C5221F",
        defaultChannel: "mail",
      },
    ],
  ],
  extra: {
    ...(projectId && { eas: { projectId } }),
    // Whether this Android build carries a Firebase configuration (FCM delivers Expo pushes).
    push: { fcm: !!googleServices },
  },
};

module.exports = config;
