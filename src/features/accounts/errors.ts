import { isApiError } from "../../api/errors";
import { t } from "../../lib/i18n";

/**
 * What to show for a failed account request: a Polish sentence for the stable `code` (plan 5.3)
 * and the server's `detail` (the limit, the refused host, what the mail server answered). Never
 * anything of the request, so a password cannot end up on screen or in a log.
 */
export function accountError(err: unknown): { message: string; detail?: string } {
  if (!isApiError(err)) return { message: t.serverUnreachable };
  const message = (err.code && t.accountErrors[err.code]) || t.genericError;
  const detail = err.problem?.detail;
  return detail && detail !== message ? { message, detail } : { message };
}
