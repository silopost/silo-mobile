import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";

/** GET /sessions: the sessions of the user, browsers and devices. */
export const sessionsQuery = queryOptions({
  queryKey: keys.sessions,
  queryFn: async ({ signal }) => (await call(api().GET("/sessions", { signal }))).sessions ?? [],
});

/** DELETE /sessions/{id}: signs another browser or device out. */
export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call(api().DELETE("/sessions/{id}", { params: { path: { id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.sessions }),
  });
}
