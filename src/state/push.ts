import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PushState = {
  /** The user switched new-mail notifications on on this device (for the signed-in session). */
  enabled: boolean;
  /** Accounts (acc_…) to notify about; null: every account, also ones added later. */
  accountIds: string[] | null;
  /** The device the server answered last (dev_…), for DELETE /devices/{id}. */
  deviceId: string | null;
};

export const defaultPush: PushState = { enabled: false, accountIds: null, deviceId: null };

/**
 * The notification choice of this device, kept like the other device preferences (AsyncStorage,
 * src/state/ui.ts). The server is the source of truth about the registration
 * (GET /devices/current); this only says whether the app should keep registering the device.
 * Every sign-out resets it, so a later sign-in (perhaps to another server) registers nothing
 * without the user switching notifications on again.
 */
export const usePush = create<PushState>()(
  persist(() => ({ ...defaultPush }), {
    name: "silo.push",
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export const resetPush = () => usePush.setState({ ...defaultPush });
