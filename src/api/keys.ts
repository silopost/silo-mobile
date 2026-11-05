/** Query keys (plan 6.4); later slices add the keys of the mail views. */
export const keys = {
  session: ["session"] as const,
  /** Per instance: the sign-in screen asks the address being typed. */
  meta: (serverUrl: string) => ["meta", serverUrl] as const,
  sessions: ["sessions"] as const,
  labels: (accountId: string) => ["labels", accountId] as const,
};
