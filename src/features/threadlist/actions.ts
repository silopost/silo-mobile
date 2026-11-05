import { createContext, useContext } from "react";
import { t } from "../../lib/i18n";
import type { SwipeAction } from "../../state/ui";
import { toast } from "../../state/toasts";

/** Actions on threads, named as silo-web's (the endpoints come with slice 4). */
export type ThreadAction =
  | "archive"
  | "inbox"
  | "trash"
  | "untrash"
  | "spam"
  | "notSpam"
  | "read"
  | "unread"
  | "star"
  | "unstar"
  | "labels"
  | "moveTo"
  | "deleteForever";

export type RunOptions = {
  /** Label of the view the action was taken in (archive removes it, as in Gmail). */
  labelId?: string;
};

export type ThreadActions = {
  /** Runs an action on threads; resolves when it is done (or announced). */
  run(action: ThreadAction, ids: string[], opts?: RunOptions): Promise<void>;
};

/**
 * Stand-in until slice 4 wires the mutations (optimistic update, undo with the server's
 * undoUntil): every action only says it is coming.
 */
export const comingSoonActions: ThreadActions = {
  run: async () => toast(t.comingSoon),
};

const ThreadActionsContext = createContext<ThreadActions>(comingSoonActions);

/** Supplies the implementation of the thread actions (tests and slice 4 replace the default). */
export const ThreadActionsProvider = ThreadActionsContext.Provider;

export function useThreadActions(): ThreadActions {
  return useContext(ThreadActionsContext);
}

export type SwipeSide = "left" | "right";

/** Labels whose rows have no swipe: archiving or trashing from Trash and Spam makes no sense. */
const NO_SWIPE = new Set(["TRASH", "SPAM"]);

/**
 * The action a swipe triggers in a view, from the device preferences (Gmail's swipe actions);
 * null when that side has no action.
 */
export function swipeActionFor(
  side: SwipeSide,
  labelId: string | undefined,
  ui: { swipeLeftAction: SwipeAction; swipeRightAction: SwipeAction },
): ThreadAction | null {
  if (labelId && NO_SWIPE.has(labelId)) return null;
  const pref = side === "left" ? ui.swipeLeftAction : ui.swipeRightAction;
  return pref === "none" ? null : pref;
}
