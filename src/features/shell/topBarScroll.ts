import { createContext, useContext } from "react";
import type { Animated } from "react-native";

/**
 * Height in dp of the floating bar of the mail views (search bar or selection bar): 4 dp above
 * the 56 dp pill, 8 dp below, as measured in Gmail 2026.
 */
export const TOP_BAR_HEIGHT = 68;

/**
 * Scroll offset of the list under the floating bar of MailShell. The list writes it (natively
 * driven) and leaves TOP_BAR_HEIGHT of room above its first row; the shell slides the search bar
 * away while the list scrolls down and back while it scrolls up. Null outside MailShell.
 */
export const TopBarScroll = createContext<Animated.Value | null>(null);

export const useTopBarScroll = () => useContext(TopBarScroll);
