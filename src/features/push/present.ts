import * as Notifications from "expo-notifications";
import { AndroidNotificationPriority } from "expo-notifications";
import { AppState } from "react-native";
import { queryClient } from "../../api/cache";
import { getMessageSummaries } from "../../api/messages";
import { sessionQuery } from "../../api/queries/session";
import type { Account, MessageSummary } from "../../api/types";
import { setLocale, t } from "../../lib/i18n";
import { restoreAuth, useAuth } from "../../state/auth";
import { useUi } from "../../state/ui";
import { MAIL_CHANNEL } from "./config";
import { parseMailPush, type MailPush } from "./route";

/**
 * How long the app waits for its server before it shows the generic notification instead. The
 * push itself comes a few seconds after delivery; phase 6 wants a notification in under 10 s.
 */
export const FETCH_TIMEOUT_MS = 4000;

const MAX_SENDER = 60;
const MAX_SUBJECT = 120;
const MAX_SNIPPET = 240;

/** Control, zero-width and bidi-override characters: mail text is untrusted. */
const INVISIBLE =
  /[\u0000-\u001f\u007f-\u009f\u200b\u200c\u200e\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g;

/**
 * Mail text as one plain line: invisible and control characters become spaces, runs of white
 * space one space, and a longer text ends in "…" after `max` characters (code points).
 */
export function plainText(value: string | null | undefined, max: number): string {
  const text = (value ?? "").replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars
    .slice(0, max - 1)
    .join("")
    .trimEnd()}…`;
}

/** A notification to present: `identifier` replaces an earlier one with the same id. */
export type MailNotification = {
  identifier: string;
  content: Notifications.NotificationContentInput;
};

/** The data a tap reads (route.ts): the thread of one message, or the Inbox of a burst. */
const tapData = (accountId: string, threadId: string | null, count: number) => ({
  v: 1,
  type: "mail",
  accountId,
  threadId,
  count,
});

/** The account's address as sub-text, only when the user has more than one account. */
function subtitleOf(accountId: string, accounts: readonly Account[] | null): string | undefined {
  if (!accounts || accounts.length < 2) return undefined;
  const email = accounts.find((a) => a.id === accountId)?.email;
  return email ? plainText(email, MAX_SENDER) : undefined;
}

/**
 * One notification for the account ("New message" / "N new messages"): when the content could
 * not be fetched, and for a burst larger than the push names. It carries nothing from the mail.
 */
export function genericNotification(
  push: MailPush,
  accounts: readonly Account[] | null = null,
): MailNotification {
  return {
    identifier: `mail-${push.accountId}`,
    content: {
      title: t.pushNewMessages(push.count),
      subtitle: subtitleOf(push.accountId, accounts),
      data: tapData(push.accountId, push.threadId, push.count),
      threadIdentifier: `mail-${push.accountId}`,
      priority: AndroidNotificationPriority.HIGH,
    },
  };
}

/**
 * One notification per message, Gmail style: the sender as the title, the subject and the
 * snippet as the text (Android shows the subject collapsed and both expanded), the account as
 * sub-text with several accounts; grouped per account. Oldest first, so the newest ends on top.
 */
export function messageNotifications(
  messages: readonly MessageSummary[],
  accounts: readonly Account[] | null,
): MailNotification[] {
  return [...messages]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((m) => {
      const subject = plainText(m.subject, MAX_SUBJECT) || t.noSubject;
      const snippet = plainText(m.snippet, MAX_SNIPPET);
      return {
        identifier: `mail-${m.id}`,
        content: {
          title:
            plainText(m.from.name, MAX_SENDER) ||
            plainText(m.from.email, MAX_SENDER) ||
            t.pushUnknownSender,
          body: snippet ? `${subject}\n${snippet}` : subject,
          subtitle: subtitleOf(m.accountId, accounts),
          data: tapData(m.accountId, m.threadId, 1),
          threadIdentifier: `mail-${m.accountId}`,
          priority: AndroidNotificationPriority.HIGH,
        },
      };
    });
}

/** Runs `work` with a signal that aborts after `ms`; rejects at that time at the latest. */
function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("timeout"));
    }, ms);
    work(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** What to show for a push, from the user's own server (sender, subject, snippet). */
async function fetchNotifications(
  push: MailPush,
  signal: AbortSignal,
): Promise<MailNotification[]> {
  const accounts = queryClient
    .fetchQuery(sessionQuery)
    .then((s) => s.accounts ?? [])
    .catch(() => null);
  if (!push.messageIds) return [genericNotification(push, await accounts)];
  const messages = await getMessageSummaries(push.messageIds, signal);
  // Messages already gone (deleted, moved by another client) are not announced.
  return messageNotifications(messages, await accounts);
}

/** Signed in on this device; reads the stored session in a process the push just started. */
async function signedIn(): Promise<boolean> {
  if (useAuth.getState().status === "loading") await restoreAuth();
  return useAuth.getState().status === "signedIn";
}

/** The UI language of the last signed-in run (src/state/language.ts), for a fresh process. */
async function restoreLanguage(): Promise<void> {
  if (!useUi.persist.hasHydrated()) await useUi.persist.rehydrate();
  const stored = useUi.getState().language;
  if (stored) setLocale(stored);
}

/**
 * Presents a mail push: the messages it names as fetched from the server, or, when that fails or
 * takes longer than FETCH_TIMEOUT_MS (offline, server unreachable, session ended), the generic
 * notification the server used to send. Nothing after sign-out. Only the first notification of a
 * push plays the channel's sound, so a burst alerts once.
 */
export async function presentMailPush(push: MailPush, timeoutMs = FETCH_TIMEOUT_MS): Promise<void> {
  if (!(await signedIn())) return;
  await restoreLanguage();
  let list: MailNotification[];
  try {
    list = await withTimeout((signal) => fetchNotifications(push, signal), timeoutMs);
  } catch {
    list = [genericNotification(push)];
  }
  for (const [i, n] of list.entries()) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.identifier,
      content: { ...n.content, sound: i === 0 ? "default" : false },
      trigger: { channelId: MAIL_CHANNEL },
    });
  }
}

/**
 * The payload of the background notification task (Android: the FCM message as
 * RemoteMessageSerializer gives it). Only a data message is ours to present: a titled push (a
 * server before 0.11.0) is shown by the system, and in the foreground nothing is shown at all.
 */
export async function handleRemotePush(payload: unknown): Promise<void> {
  if (typeof payload !== "object" || payload === null || "actionIdentifier" in payload) return;
  const { notification, data } = payload as { notification?: unknown; data?: unknown };
  if (notification) return;
  if (AppState.currentState === "active") return;
  const raw = (data as { dataString?: unknown } | null | undefined)?.dataString;
  if (typeof raw !== "string") return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const push = parseMailPush(parsed);
  if (push) await presentMailPush(push);
}
