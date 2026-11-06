import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { call, isApiError } from "../errors";
import { keys } from "../keys";
import type {
  ConnectionParams,
  CreateAccount,
  PatchAccount,
  ResyncMode,
  TestResult,
} from "../types";

/** Refetches what shows an account: GET /session carries the accounts with their state. */
function invalidateAccount(qc: QueryClient, id: string) {
  void qc.invalidateQueries({ queryKey: keys.session });
  void qc.invalidateQueries({ queryKey: keys.syncStatus(id) });
}

/**
 * PATCH /accounts/{id}: display name, password, ports, TLS, sentAppend (plan 5.1). The server
 * keeps email, username and hosts. A new password moves an auth_failed account back to connecting
 * on the server, so the sync status is refetched too.
 */
export function useUpdateAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchAccount) =>
      call(api().PATCH("/accounts/{id}", { params: { path: { id } }, body })),
    onSuccess: () => invalidateAccount(qc, id),
  });
}

/**
 * DELETE /accounts/{id}: removes the account and its cache from Silo (the mailbox stays). The
 * queries of the account are dropped, the session refetched.
 */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(api().DELETE("/accounts/{id}", { params: { path: { id } } })),
    onSuccess: async (_data, id) => {
      for (const key of [keys.syncStatus(id), keys.labels(id), keys.threadsAll(id)]) {
        qc.removeQueries({ queryKey: key });
      }
      await qc.invalidateQueries({ queryKey: keys.session });
    },
  });
}

/**
 * POST /accounts/test: the IMAP and SMTP steps of a connection, nothing stored. Answers 200 even
 * when a step fails (`ok` per protocol).
 */
export function testAccount(body: ConnectionParams): Promise<TestResult> {
  return call(api().POST("/accounts/test", { body }));
}

/**
 * POST /accounts: tests the connection, stores the account and queues its initial sync. A failed
 * test is 422 account_test_failed with the steps in `problem.test` (see testFailure).
 */
export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAccount) => call(api().POST("/accounts", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.session }),
  });
}

/** The steps of a 422 account_test_failed, or undefined for other errors. */
export function testFailure(err: unknown): TestResult | undefined {
  return isApiError(err, 422) && err.code === "account_test_failed" ? err.problem?.test : undefined;
}

/**
 * POST /accounts/{id}/resync: incremental (sync all folders now) or full (also compare every
 * flag). rebuild answers 501 in API 0.3.0 and is not offered.
 */
export function useAccountResync(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: Exclude<ResyncMode, "rebuild">) =>
      call(api().POST("/accounts/{id}/resync", { params: { path: { id } }, body: { mode } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.syncStatus(id) });
      void qc.invalidateQueries({ queryKey: keys.threadsAll(id) });
      void qc.invalidateQueries({ queryKey: keys.labels(id) });
    },
  });
}
