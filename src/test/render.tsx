import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Providers } from "../Providers";

const metrics = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Renders a screen inside the app's providers (query cache, theme, safe area). */
export function renderScreen(ui: ReactElement) {
  return render(<Providers initialMetrics={metrics}>{ui}</Providers>);
}
