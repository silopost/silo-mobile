import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";

/** GET /session: the user, settings and accounts with their state. */
export const sessionQuery = queryOptions({
  queryKey: keys.session,
  queryFn: ({ signal }) => call(api().GET("/session", { signal })),
  staleTime: 60_000,
  retry: false,
});
