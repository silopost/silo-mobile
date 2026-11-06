import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "../../lib/i18n";
import { toast } from "../../state/toasts";
import { api } from "../client";
import { call, isApiError } from "../errors";
import { keys } from "../keys";
import type { CreateLabelBody, Label, UpdateLabelBody } from "../types";
import type { LabelsData } from "./cache";

/** A new user label: its name, and on server 0.4.0 optionally a colour and a parent. */
export type NewLabel = Pick<CreateLabelBody, "name" | "colorBg" | "colorText" | "parentId">;

/** A Polish sentence for a refused label change (409 name taken, 422 invalid_parent). */
export function labelErrorMessage(err: unknown): string {
  if (isApiError(err, 409)) return t.labelExists;
  if (isApiError(err, 422) && err.code === "invalid_parent") return t.labelInvalidParent;
  if (isApiError(err, 422) || isApiError(err, 400)) return t.labelRefused;
  return t.genericError;
}

/**
 * POST /labels of a user label (an IMAP keyword on the server, plan 5.1); the label list is
 * refetched, `onCreated` gets the new label (e.g. to apply it at once).
 */
export function useCreateLabel(accountId: string, onCreated?: (label: Label) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string | NewLabel) => {
      const fields = typeof label === "string" ? { name: label } : label;
      return call(api().POST("/labels", { body: { accountId, type: "user", ...fields } }));
    },
    onSuccess: (label) => {
      void qc.invalidateQueries({ queryKey: keys.labels(accountId) });
      onCreated?.(label);
    },
    onError: (err) => toast(labelErrorMessage(err)),
  });
}

/**
 * PATCH /labels/{id} (server 0.4.0): rename, recolour, move under another label, show or hide in
 * the drawer. The list shows the change at once; an error puts it back with a snackbar. The
 * server answers label.changed to the other devices; renaming moves the keyword on the server.
 */
export function useUpdateLabel(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLabelBody }) =>
      call(api().PATCH("/labels/{id}", { params: { path: { id } }, body })),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: keys.labels(accountId) });
      const prev = qc.getQueryData<LabelsData>(keys.labels(accountId));
      const patch: Partial<Label> = { ...body } as Partial<Label>;
      // An empty colour clears it.
      if (body.colorBg === "") patch.colorBg = null;
      if (body.colorText === "") patch.colorText = null;
      qc.setQueryData<LabelsData>(keys.labels(accountId), (d) =>
        d?.labels
          ? { ...d, labels: d.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) }
          : d,
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.labels(accountId), ctx.prev);
      toast(labelErrorMessage(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.labels(accountId) }),
  });
}

/**
 * DELETE /labels/{id} of a user label: the server removes it and takes its keyword off the
 * messages (queued). The rows and the labels are refetched.
 */
export function useDeleteLabel(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(api().DELETE("/labels/{id}", { params: { path: { id } } })),
    onSuccess: () => {
      toast(t.labelDeleted);
      void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
    },
    onError: (err) => toast(labelErrorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.labels(accountId) }),
  });
}
