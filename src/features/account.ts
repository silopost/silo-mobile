import { useQuery } from "@tanstack/react-query";
import { useGlobalSearchParams } from "expo-router";
import { sessionQuery } from "../api/queries/session";
import type { components } from "../api/schema";

export type Account = components["schemas"]["Account"];
export type Session = components["schemas"]["SessionBody"];

/** The session (GET /session); undefined until loaded. */
export function useSession(): Session | undefined {
  return useQuery(sessionQuery).data;
}

/** Accounts of the session ordered by Account.position (the /u/<n> index). */
export function sortedAccounts(session: Session | undefined): Account[] {
  return [...(session?.accounts ?? [])].sort((a, b) => a.position - b.position);
}

/** The account shown by default: settings.activeAccountId, else the first by position. */
export function defaultAccount(session: Session | undefined): Account | undefined {
  const accounts = sortedAccounts(session);
  const id = session?.settings.activeAccountId;
  return accounts.find((a) => a.id === id) ?? accounts[0];
}

/** Account index of the route (/u/<index>/…, plan 6.2); 0 outside account routes. */
export function useAccountIndex(): number {
  const { account } = useGlobalSearchParams<{ account?: string }>();
  const n = Number(account ?? 0);
  return Number.isInteger(n) ? n : 0;
}

/** The account of the route: /u/<n> is the account with Account.position n. */
export function useActiveAccount(): Account | undefined {
  const index = useAccountIndex();
  return useSession()?.accounts?.find((a) => a.position === index);
}
