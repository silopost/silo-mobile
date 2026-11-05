import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { runThreadAction } from "../../api/mutations/threads";
import { t } from "../../lib/i18n";
import { toast } from "../../state/toasts";
import { useActiveAccount } from "../account";
import {
  ThreadActionsProvider,
  type RunOptions,
  type ThreadAction,
  type ThreadActions,
} from "./actions";

/** An action waiting for the user: the confirmation of delete forever. */
type Pending = {
  kind: "deleteForever";
  ids: string[];
  opts: RunOptions;
  /** Resolves the run() that opened it. */
  done: () => void;
};

/**
 * The thread actions of the account in the route (swipe, star, selection bar, later the thread
 * screen): mutations with optimistic update and "Cofnij" (runThreadAction), and the confirmation
 * dialog of delete forever.
 */
export function ThreadActionsRoot({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const account = useActiveAccount();
  const [pending, setPending] = useState<Pending | null>(null);
  const accountId = account?.id;

  const execute = (action: ThreadAction, ids: string[], opts: RunOptions = {}) => {
    if (!accountId || ids.length === 0) return Promise.resolve();
    return runThreadAction(qc, {
      accountId,
      ids,
      action,
      add: opts.add,
      remove: opts.remove,
      target: opts.target,
      viewLabelId: opts.labelId,
    });
  };

  const actions: ThreadActions = {
    run: (action, ids, opts = {}) => {
      if (action === "deleteForever") {
        return new Promise<void>((done) => setPending({ kind: action, ids, opts, done }));
      }
      if (
        (action === "labels" && !opts.add && !opts.remove) ||
        (action === "moveTo" && !opts.target)
      ) {
        toast(t.comingSoon);
        return Promise.resolve();
      }
      return execute(action, ids, opts);
    },
  };

  const close = () => {
    pending?.done();
    setPending(null);
  };

  return (
    <ThreadActionsProvider value={actions}>
      {children}
      {pending?.kind === "deleteForever" && (
        <Portal>
          <Dialog visible onDismiss={close} testID="delete-forever-dialog">
            <Dialog.Title>{t.deleteForeverTitle}</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">{t.deleteForeverBody(pending.ids.length)}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={close}>{t.cancel}</Button>
              <Button
                onPress={() => {
                  const { ids, opts, done } = pending;
                  setPending(null);
                  void execute("deleteForever", ids, opts).then(done);
                }}
              >
                {t.deleteForever}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </ThreadActionsProvider>
  );
}
