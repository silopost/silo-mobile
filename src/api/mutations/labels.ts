import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "../../lib/i18n";
import { toast } from "../../state/toasts";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";
import type { Label } from "../types";

/**
 * POST /labels of a user label (an IMAP keyword on the server, plan 5.1); the label list is
 * refetched, `onCreated` gets the new label (e.g. to apply it at once).
 */
export function useCreateLabel(accountId: string, onCreated?: (label: Label) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      call(api().POST("/labels", { body: { accountId, name, type: "user" } })),
    onSuccess: (label) => {
      void qc.invalidateQueries({ queryKey: keys.labels(accountId) });
      onCreated?.(label);
    },
    onError: () => toast(t.genericError),
  });
}
