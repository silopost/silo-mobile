import { EditorKeyboardAvoidingView, type CaretScrollView } from "@10play/tentap-editor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AppState,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewInstance,
} from "react-native";
import { ActivityIndicator, Appbar, Button, Dialog, Menu, Portal, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDraft } from "../api/drafts";
import { metaQuery } from "../api/queries/meta";
import { defaultAccount, useSession } from "../features/account";
import { AttachSheet, AttachmentList } from "../features/compose/AttachmentList";
import { BodyEditor, EditorToolbar, useComposeEditor } from "../features/compose/Editor";
import { RecipientInput } from "../features/compose/RecipientInput";
import {
  getSession,
  openLoaded,
  type DraftSession,
  type Field,
  type SessionState,
} from "../features/compose/session";
import { Snackbar } from "../features/toasts/Snackbar";
import { ScheduleSendSheet } from "../features/compose/ScheduleSendSheet";
import { useServerFeature } from "../lib/features";
import { t } from "../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { useAuth } from "../state/auth";
import { useCompose } from "../state/compose";

/** A warning or error strip below the top bar, with its actions ("Wczytaj", "Nadpisz"). */
function Bar({
  tone,
  text,
  actions = [],
}: {
  tone: "warn" | "error";
  text: string;
  actions?: [string, () => void][];
}) {
  const theme = useAppTheme();
  const colors =
    tone === "error"
      ? { bg: theme.colors.errorContainer, fg: theme.colors.onErrorContainer }
      : { bg: theme.colors.secondaryContainer, fg: theme.colors.onSecondaryContainer };
  return (
    <View accessibilityLiveRegion="polite" style={[styles.bar, { backgroundColor: colors.bg }]}>
      <Text style={[styles.barText, { color: colors.fg }]}>{text}</Text>
      {actions.map(([label, run]) => (
        <Button key={label} compact textColor={colors.fg} onPress={run} accessibilityLabel={label}>
          {label}
        </Button>
      ))}
    </View>
  );
}

/** The bars of the draft: send error, failed send, conflict, change in another program. */
function Bars({ session, state }: { session: DraftSession; state: SessionState }) {
  const failure = useCompose((s) => s.failures[session.id]);
  const remoteVersion = useCompose((s) => s.remoteVersions[session.id] ?? 0);
  // Saved elsewhere: a 409 of our own save, or a draft.updated event of a newer version.
  const conflict = state.conflict || (state.loaded && remoteVersion > state.version);
  return (
    <>
      {state.error && <Bar tone="error" text={state.error} />}
      {failure && (
        <Bar
          tone="error"
          text={[
            t.sendFailedIn(failure.error || t.genericError),
            failure.failedRecipients?.length
              ? t.failedRecipients(failure.failedRecipients.join(", "))
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      )}
      {conflict && (
        <Bar
          tone="warn"
          text={t.draftConflict}
          actions={[
            [t.reload, () => void session.reload()],
            [t.overwrite, () => void session.overwrite()],
          ]}
        />
      )}
      {!conflict && state.serverChanged && (
        <Bar
          tone="warn"
          text={t.draftServerChanged}
          actions={[[t.reload, () => void session.reload()]]}
        />
      )}
    </>
  );
}

/** The fields of a loaded draft: Od, Do (DW, UDW), Temat, body, attachments, toolbar. */
function ComposeForm({ session, state }: { session: DraftSession; state: SessionState }) {
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const account = useSession()?.accounts?.find((a) => a.id === state.accountId);
  const { form } = state;
  const [ccOpen, setCcOpen] = useState(false);
  const showCc = ccOpen || form.cc.length > 0 || form.bcc.length > 0;
  const failed = new Set(useCompose((s) => s.failures[session.id]?.failedRecipients) ?? []);
  const invalidIn = (field: Field) => {
    if (state.invalid?.field === field) return state.invalid.address;
    // A recipient the mail server refused at the last send (lastSend.failedRecipients).
    return form[field].find((a) => failed.has(a.email))?.email;
  };
  const editor = useComposeEditor({
    content: form.bodyJson ?? form.bodyHtml,
    loadSeq: state.loadSeq,
    onChange: (bodyHtml, bodyJson) => session.edit(() => ({ bodyHtml, bodyJson })),
    scrollRef: scrollRef as unknown as RefObject<CaretScrollView | null>,
  });
  const muted = theme.colors.onSurfaceVariant;
  const line = { borderBottomColor: theme.colors.outlineVariant };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        style={styles.fill}
        contentContainerStyle={styles.scroll}
      >
        <View style={[styles.fromRow, line]}>
          <Text style={[styles.fieldLabel, { color: muted }]}>{t.from}</Text>
          <Text
            numberOfLines={1}
            style={styles.fromText}
            accessibilityLabel={`${t.from}: ${account?.email ?? ""}`}
          >
            {account?.email ?? ""}
          </Text>
        </View>
        <RecipientInput
          label={t.toLabel}
          value={form.to}
          invalidAddress={invalidIn("to")}
          onChange={(to) => session.edit(() => ({ to }))}
          onBlur={() => void session.save()}
          autoFocus={form.to.length === 0}
          right={
            !showCc && (
              <Appbar.Action
                icon="chevron-down"
                accessibilityLabel={t.showCcBcc}
                onPress={() => setCcOpen(true)}
              />
            )
          }
        />
        {showCc && (
          <>
            <RecipientInput
              label={t.cc}
              value={form.cc}
              invalidAddress={invalidIn("cc")}
              onChange={(cc) => session.edit(() => ({ cc }))}
              onBlur={() => void session.save()}
            />
            <RecipientInput
              label={t.bcc}
              value={form.bcc}
              invalidAddress={invalidIn("bcc")}
              onChange={(bcc) => session.edit(() => ({ bcc }))}
              onBlur={() => void session.save()}
            />
          </>
        )}
        <TextInput
          value={form.subject}
          onChangeText={(subject) => session.edit(() => ({ subject }))}
          onBlur={() => void session.save()}
          placeholder={t.subject}
          placeholderTextColor={muted}
          accessibilityLabel={t.subject}
          style={[styles.subject, line, { color: theme.colors.onSurface }]}
        />
        <BodyEditor editor={editor} />
        <AttachmentList
          attachments={form.attachments}
          uploads={state.uploads}
          onRemove={(id) => session.removeAttachment(id)}
          onRemoveUpload={(key) => session.removeUpload(key)}
        />
      </ScrollView>
      <EditorToolbar editor={editor} />
    </>
  );
}

/**
 * Full-screen compose of the Gmail app (plan 6.3): back arrow (closes and saves), paperclip,
 * send and ⋮ (Zapisz wersję roboczą, Odrzuć) in the top bar, then Od, Do with chips (DW/UDW
 * behind "∨"), Temat, the body editor and the attachments. /compose without draftId creates the
 * draft first (POST /drafts for the account of the list it was opened from).
 */
export function ComposeScreen() {
  const params = useLocalSearchParams<{ draftId?: string; accountId?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const serverUrl = useAuth((s) => s.serverUrl);
  const session = useSession();
  const [draftId, setDraftId] = useState(params.draftId);
  const [createFailed, setCreateFailed] = useState(false);
  // maxAttachmentBytes for the check before an upload (DraftSession.addFiles).
  useQuery({ ...metaQuery(serverUrl ?? ""), enabled: !!serverUrl });

  // A new message: POST /drafts once, then the screen edits that draft.
  const creating = useRef(false);
  const accountId = params.accountId ?? defaultAccount(session)?.id;
  useEffect(() => {
    if (draftId || creating.current || !accountId) return;
    creating.current = true;
    createDraft({ accountId })
      .then((d) => {
        openLoaded(qc, d, { created: true });
        setDraftId(d.id);
        router.setParams({ draftId: d.id });
      })
      .catch(() => setCreateFailed(true));
  }, [draftId, accountId, qc, router]);

  if (!draftId)
    return (
      <Shell title={t.compose} onBack={() => router.back()}>
        {createFailed ? (
          <Bar tone="error" text={t.genericError} />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator accessibilityLabel={t.creatingDraft} />
          </View>
        )}
      </Shell>
    );
  return <ComposeDraft key={draftId} draftId={draftId} />;
}

function ComposeDraft({ draftId }: { draftId: string }) {
  const qc = useQueryClient();
  const navigation = useNavigation();
  const router = useRouter();
  const [session] = useState(() => getSession(qc, draftId));
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const [menu, setMenu] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const canSchedule = useServerFeature("schedule");
  const { form } = state;
  const hasRecipients = form.to.length + form.cc.length + form.bcc.length > 0;

  useEffect(() => {
    void session.ensureLoaded();
  }, [session]);

  // Leaving the screen (back arrow, system back, router.back) saves with syncNow; a send or a
  // discard has stopped the session already, so close() does nothing then.
  // The "removed" event comes after the unmount, so unsubscribing waits a microtask.
  useEffect(() => {
    const unsubscribe = navigation.addListener("removed", () => void session.close());
    return () => queueMicrotask(unsubscribe);
  }, [navigation, session]);

  // Android may end the app in the background: the in-memory edits go to the server first.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") void session.flushNow();
    });
    return () => sub.remove();
  }, [session]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const send = async () => {
    if (await session.send()) close();
  };
  const schedule = async (sendAt: string) => {
    setScheduleOpen(false);
    if (await session.send(sendAt)) close();
  };
  const discard = () => {
    setConfirmDiscard(false);
    void session.discard();
    close();
  };

  const more = (
    <Appbar.Action
      icon="dots-vertical"
      accessibilityLabel={t.composeMenu}
      onPress={() => setMenu(true)}
    />
  );

  return (
    <Shell
      title={t.compose}
      onBack={close}
      actions={
        <>
          <Appbar.Action
            icon="paperclip"
            accessibilityLabel={t.attach}
            disabled={!state.loaded}
            onPress={() => setAttachOpen(true)}
          />
          <Appbar.Action
            icon="send-outline"
            accessibilityLabel={state.sending ? t.sending : t.send}
            disabled={!state.loaded || !hasRecipients || state.sending}
            onPress={() => void send()}
          />
          {/* Mounted only while open (Paper's Menu hides itself on mount otherwise). */}
          {menu ? (
            <Menu visible onDismiss={() => setMenu(false)} anchor={more}>
              {canSchedule && (
                <Menu.Item
                  title={t.scheduleSend}
                  disabled={!state.loaded || !hasRecipients || state.sending}
                  onPress={() => {
                    setMenu(false);
                    setScheduleOpen(true);
                  }}
                />
              )}
              <Menu.Item
                title={t.saveDraft}
                onPress={() => {
                  setMenu(false);
                  close();
                }}
              />
              <Menu.Item
                title={t.discard}
                onPress={() => {
                  setMenu(false);
                  setConfirmDiscard(true);
                }}
              />
            </Menu>
          ) : (
            more
          )}
        </>
      }
    >
      <Bars session={session} state={state} />
      {state.loaded ? (
        <ComposeForm session={session} state={state} />
      ) : (
        !state.error && (
          <View style={styles.center}>
            <ActivityIndicator accessibilityLabel={t.loading} />
          </View>
        )
      )}
      <ScheduleSendSheet
        visible={scheduleOpen}
        onDismiss={() => setScheduleOpen(false)}
        onSelect={(sendAt) => void schedule(sendAt)}
      />
      <AttachSheet
        visible={attachOpen}
        onDismiss={() => setAttachOpen(false)}
        onFiles={(files) => session.addFiles(files)}
      />
      {confirmDiscard && (
        <Portal>
          <Dialog visible onDismiss={() => setConfirmDiscard(false)}>
            <Dialog.Title>{t.discardTitle}</Dialog.Title>
            <Dialog.Content>
              <Text>{t.discardBody}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmDiscard(false)} contentStyle={styles.touch}>
                {t.cancel}
              </Button>
              <Button onPress={discard} contentStyle={styles.touch} testID="confirm-discard">
                {t.discard}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </Shell>
  );
}

/** The screen frame: top bar, keyboard-avoiding content, the snackbar of compose. */
function Shell({
  title,
  onBack,
  actions,
  children,
}: {
  title: string;
  onBack: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.fill, { backgroundColor: theme.colors.background }]}
    >
      <Appbar.Header statusBarHeight={0} style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction accessibilityLabel={t.saveAndClose} onPress={onBack} />
        <Appbar.Content title={title} />
        {actions}
      </Appbar.Header>
      <EditorKeyboardAvoidingView style={styles.fill}>{children}</EditorKeyboardAvoidingView>
      <Snackbar offset={64} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: MIN_TOUCH,
  },
  barText: { flex: 1, paddingVertical: 8 },
  fromRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { width: 40, fontSize: 16 },
  fromText: { flex: 1, fontSize: 16 },
  subject: {
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  touch: { minHeight: MIN_TOUCH },
});
