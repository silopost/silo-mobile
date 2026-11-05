import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { findCachedThread } from "../../api/mutations/cache";
import { runThreadAction } from "../../api/mutations/threads";
import { keys } from "../../api/keys";
import type { ThreadDetail } from "../../api/types";
import { t } from "../../lib/i18n";
import { useActiveAccount } from "../account";
import { LabelsSheet } from "../labels/LabelsSheet";
import { MoveToSheet } from "../labels/MoveToSheet";
import {
  ThreadActionsProvider,
  type RunOptions,
  type ThreadAction,
  type ThreadActions,
} from "./actions";

/** An action waiting for the user: a confirmation or the choice in a sheet. */
type Pending = {
  kind: "deleteForever" | "labels" | "moveTo";
  ids: string[];
  opts: RunOptions;
  /** Resolves the run() that opened it. */
  done: () => void;
};

/**
 * The thread actions of the account in the route (swipe, star, selection bar, later the thread
 * screen): mutations with optimistic update and "Cofnij" (runThreadAction), the confirmation
 * dialog of delete forever and the sheets that ask what to apply ("Etykiety", "Przenieś do"). The sheets are
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
      if (action === "moveTo" && !opts.target) return ask(action, ids, opts);
      return execute(action, ids, opts);
    },
  };

  /** Runs the pending action with the user's choice. */
  const finish = (choice: RunOptions = {}) => {
    if (!pending) return;
    const { kind, ids, opts, done } = pending;
    setPending(null);
    void execute(kind, ids, { ...opts, ...choice }).then(done);
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
          onApply={(add, remove) => finish({ add, remove })}
        />
      )}
      {pending?.kind === "moveTo" && accountId && (
        <MoveToSheet
          visible
          onDismiss={close}
          accountId={accountId}
          currentLabelId={pending.opts.labelId}
          onSelect={(target) => finish({ target })}
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
              <Button onPress={() => finish()}>{t.deleteForever}</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </ThreadActionsProvider>
  );
}
