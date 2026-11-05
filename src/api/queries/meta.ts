import { queryOptions } from "@tanstack/react-query";
import { createApiClient } from "../client";
import { call } from "../errors";
import { keys } from "../keys";

/** GET /meta of an instance (public): server version and limits. */
export const metaQuery = (serverUrl: string) =>
  queryOptions({
    queryKey: keys.meta(serverUrl),
    queryFn: ({ signal }) => call(createApiClient(serverUrl).GET("/meta", { signal })),
    staleTime: Infinity,
    retry: false,
  });
