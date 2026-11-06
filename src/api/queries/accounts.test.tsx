import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { accountError } from "../../features/accounts/errors";
import { useAuth } from "../../state/auth";
import { account, sessionBody } from "../../test/fixtures";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { keys } from "../keys";
import type { TestResult } from "../types";
import {
  testAccount,
  testFailure,
  useAccountResync,
  useDeleteAccount,
  useUpdateAccount,
} from "./accounts";

setupMsw();

const result: TestResult = {
  imap: { ok: true, steps: [{ step: "connect", ok: true, ms: 12 }] },
  smtp: { ok: false, steps: [{ step: "auth", ok: false, ms: 30, detail: "535 bad password" }] },
};

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
});

describe("accounts API", () => {
  it("POST /accounts/test returns the steps", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/accounts/test`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(result);
      }),
    );
    await expect(testAccount({ email: "a@b.pl", password: "pw" })).resolves.toEqual(result);
    expect(body).toEqual({ email: "a@b.pl", password: "pw" });
  });

  it("reads the steps of 422 account_test_failed", async () => {
    server.use(
      http.post(`${API}/accounts/test`, () =>
        HttpResponse.json(
          { code: "account_test_failed", status: 422, test: result },
          { status: 422 },
        ),
      ),
    );
    const err = await testAccount({ password: "pw" }).catch((e: unknown) => e);
    expect(testFailure(err)).toEqual(result);
    expect(accountError(err).message).toMatch(/Nie udało się połączyć/);
  });

  it("describes a limit with the server's detail", async () => {
    server.use(
      http.post(`${API}/accounts/test`, () =>
        HttpResponse.json(
          { code: "account_limit_reached", status: 409, detail: "limit 5" },
          { status: 409 },
        ),
      ),
    );
    const err = await testAccount({ password: "pw" }).catch((e: unknown) => e);
    expect(testFailure(err)).toBeUndefined();
    expect(accountError(err)).toEqual({
      message: "Osiągnięto limit kont na tym serwerze Silo.",
      detail: "limit 5",
    });
  });

  it("PATCH /accounts/{id} invalidates the session", async () => {
    let body: unknown;
    server.use(
      http.patch(`${API}/accounts/acc_1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...account, displayName: "Alicja" });
      }),
      http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    );
    qc.setQueryData(keys.session, sessionBody);
    const { result: hook } = await renderHook(() => useUpdateAccount("acc_1"), { wrapper });

    await act(() => hook.current.mutateAsync({ displayName: "Alicja" }));

    expect(body).toEqual({ displayName: "Alicja" });
    expect(qc.getQueryState(keys.session)?.isInvalidated).toBe(true);
  });

  it("DELETE /accounts/{id} drops the account's queries", async () => {
    server.use(http.delete(`${API}/accounts/acc_1`, () => new HttpResponse(null, { status: 204 })));
    qc.setQueryData(keys.labels("acc_1"), { labels: [] });
    const { result: hook } = await renderHook(() => useDeleteAccount(), { wrapper });

    await act(() => hook.current.mutateAsync("acc_1"));

    expect(qc.getQueryData(keys.labels("acc_1"))).toBeUndefined();
  });

  it("POST /accounts/{id}/resync sends the mode", async () => {
    const modes: unknown[] = [];
    server.use(
      http.post(`${API}/accounts/acc_1/resync`, async ({ request }) => {
        modes.push(await request.json());
        return new HttpResponse(null, { status: 202 });
      }),
    );
    const { result: hook } = await renderHook(() => useAccountResync("acc_1"), { wrapper });

    await act(() => hook.current.mutateAsync("full"));

    await waitFor(() => expect(modes).toEqual([{ mode: "full" }]));
  });
});
