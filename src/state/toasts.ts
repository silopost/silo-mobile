import { create } from "zustand";

export type ToastAction = { label: string; onPress: () => void };

export type Toast = {
  /** Distinguishes a toast from an equal one shown again (restarts the snackbar). */
  id: number;
  message: string;
  action?: ToastAction;
  /**
   * When the snackbar disappears (epoch ms). Only how long it is shown: an undo window is decided
   * by the server (`undoUntil`), never by this time (plan 2.6).
   */
  hideAt?: number;
};

/** How long a toast without hideAt stays (Material's default for a short message). */
export const DEFAULT_DURATION = 4000;

type ToastState = { current: (Toast & { duration: number }) | null };

/** The one snackbar of the app (a newer toast replaces the shown one, as in Gmail). */
export const useToasts = create<ToastState>()(() => ({ current: null }));

let nextId = 1;

export function show(toast: Omit<Toast, "id">): void {
  // Turned into a duration here: the snackbar renders without reading the clock.
  const duration = toast.hideAt ? Math.max(1000, toast.hideAt - Date.now()) : DEFAULT_DURATION;
  useToasts.setState({ current: { ...toast, id: nextId++, duration } });
}

/** Shorthand for a plain message. */
export const toast = (message: string) => show({ message });

export function hideToast(id?: number): void {
  const { current } = useToasts.getState();
  if (current && (id === undefined || current.id === id)) useToasts.setState({ current: null });
}
