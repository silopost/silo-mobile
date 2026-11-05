import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { findCachedThread } from "../../api/mutations/cache";
import { runThreadAction } from "../../api/mutations/threads";
import { keys } from "../../api/keys";
import type { ThreadDetail } from "../../api/types";
import { t } from "../../lib/i18n";
import { toast } from "../../state/toasts";
import { useActiveAccount } from "../account";
import { LabelsSheet } from "../labels/LabelsSheet";
import {
  ThreadActionsProvider,
  type RunOptions,
  type ThreadAction,
  type ThreadActions,
} from "./actions";

/** An action waiting for the user: a confirmation or the choice in a sheet. */
type Pending = {
  kind: "deleteForever" | "labels";
  ids: string[];
  opts: RunOptions;
  /** Resolves the run() that opened it. */
  done: () => void;
};

/**
 * The thread actions of the account in the route (swipe, star, selection bar, later the thread
 * screen): mutations with optimistic update and "Cofnij" (runThreadAction), the confirmation
 * dialog of delete forever and the sheets that ask what to apply ("Etykiety"). The sheets are
 * opened by run() without a choice, so every caller gets them.
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

  /** Labels of the threads as cached (an open thread, else a list row). */
  const threadLabels = (ids: string[]) =>
    ids.map((id) => ({
      id,
      labelIds:
        qc.getQueryData<ThreadDetail>(keys.thread(id))?.labelIds ??
        findCachedThread(qc, id)?.labelIds ??
        [],
    }));

  const ask = (kind: Pending["kind"], ids: string[], opts: RunOptions) =>
    new Promise<void>((done) => setPending({ kind, ids, opts, done }));

  const actions: ThreadActions = {
    run: (action, ids, opts = {}) => {
      if (action === "deleteForever") return ask(action, ids, opts);
      if (action === "labels" && !opts.add && !opts.remove) return ask(action, ids, opts);
      if (action === "moveTo" && !opts.target) {
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
      {pending?.kind === "labels" && accountId && (
        <LabelsSheet
          visible
          onDismiss={close}
          accountId={accountId}
          threads={threadLabels(pending.ids)}
          onApply={(add, remove) => {
            const { ids, opts, done } = pending;
            setPending(null);
            void execute("labels", ids, { ...opts, add, remove }).then(done);
          }}
        />
      )}
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
