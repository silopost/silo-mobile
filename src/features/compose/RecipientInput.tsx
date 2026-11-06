import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import { contactsQuery } from "../../api/drafts";
import type { Address } from "../../api/types";
import { Avatar } from "../../components/Avatar";
import { parseAddresses } from "../../lib/addresses";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

type Props = {
  /** "Do", "DW" or "UDW". */
  label: string;
  value: Address[];
  onChange: (value: Address[]) => void;
  /** An address the server refused (Problem.address of this field): its chip is red. */
  invalidAddress?: string;
  /** The field lost focus (the draft is saved then, plan 3.8). */
  onBlur?: () => void;
  /** Controls at the end of the row (the "∨" that shows DW / UDW). */
  right?: ReactNode;
  autoFocus?: boolean;
};

/** Autocomplete waits this long after typing (plan 6.3). */
export const AUTOCOMPLETE_DEBOUNCE_MS = 150;
const MAX_SUGGESTIONS = 6;

const same = (a: Address, b: Address) => a.email.toLowerCase() === b.email.toLowerCase();

/** Typed text that ends an address: a comma or semicolon, or a space after "…@…". */
const ends = (text: string) => /[,;\n]\s*$/.test(text) || /\S@\S*\s$/.test(text);

/**
 * Recipients as chips, as in the Gmail app (plan 6.3): Enter, comma, semicolon, a space after an
 * address or leaving the field turn the text into chips, pasted lists are split, suggestions come
 * from GET /contacts/autocomplete. A chip is removed with its "x" or a long press. The app checks
 * no address itself: a chip turns red only when the server refused it (plan 2.6).
 */
export function RecipientInput({
  label,
  value,
  onChange,
  invalidAddress,
  onBlur,
  right,
  autoFocus,
}: Props) {
  const theme = useAppTheme();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), AUTOCOMPLETE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const contacts = useQuery({ ...contactsQuery(q), enabled: q.length > 0 });
  const items = (contacts.data?.contacts ?? [])
    .filter((c) => !value.some((v) => same(v, c)))
    .slice(0, MAX_SUGGESTIONS);
  const showList = focused && text.trim().length > 0 && q.length > 0 && items.length > 0;

  const add = (list: Address[]) => {
    const next = [...value];
    for (const a of list) if (a.email && !next.some((v) => same(v, a))) next.push(a);
    if (next.length !== value.length) onChange(next);
    setText("");
    setQ("");
  };
  const commit = (raw: string) => {
    if (raw.trim()) add(parseAddresses(raw));
    else setText("");
  };
  const remove = (a: Address) => onChange(value.filter((v) => v !== a));

  const onChangeText = (next: string) => {
    // A paste of several addresses, or a separator typed after one.
    const pasted = next.length - text.length > 1 && /[,;\n]|@.*\s.*@/.test(next);
    if (pasted || ends(next)) commit(next);
    else setText(next);
  };

  return (
    <View>
      <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <View style={styles.chips} accessibilityLabel={t.recipientsOf(label)}>
          {value.map((a) => {
            const bad = a.email === invalidAddress;
            const name = a.name || a.email;
            return (
              <Pressable
                key={a.email}
                onLongPress={() => remove(a)}
                accessibilityRole="button"
                accessibilityLabel={bad ? `${name}, ${t.invalidRecipient}` : name}
                accessibilityHint={t.removeRecipient(a.email)}
                style={[
                  styles.chip,
                  bad
                    ? {
                        backgroundColor: theme.colors.errorContainer,
                        borderColor: theme.colors.error,
                      }
                    : { borderColor: theme.colors.outlineVariant },
                ]}
              >
                <Avatar address={a} size={24} />
                <Text
                  numberOfLines={1}
                  style={[styles.chipText, bad && { color: theme.colors.onErrorContainer }]}
                >
                  {name}
                </Text>
                <Pressable
                  onPress={() => remove(a)}
                  accessibilityRole="button"
                  accessibilityLabel={t.removeRecipient(a.email)}
                  hitSlop={12}
                  style={styles.chipClose}
                >
                  <Icon source="close" size={16} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              </Pressable>
            );
          })}
          <TextInput
            value={text}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit(text);
              onBlur?.();
            }}
            onSubmitEditing={() => commit(text)}
            submitBehavior="submit"
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace" && !text && value.length > 0)
                onChange(value.slice(0, -1));
            }}
            autoFocus={autoFocus}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
            accessibilityLabel={t.recipientInput(label)}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[styles.input, { color: theme.colors.onSurface }]}
          />
        </View>
        {right}
      </View>
      {invalidAddress && value.some((a) => a.email === invalidAddress) && (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.invalid, { color: theme.colors.error }]}
        >
          {`${t.invalidRecipient}: ${invalidAddress}`}
        </Text>
      )}
      {showList && (
        <View accessibilityLabel={t.suggestions} style={{ backgroundColor: theme.colors.surface }}>
          {items.map((c) => (
            <Pressable
              key={c.email}
              onPress={() => add([{ name: c.name, email: c.email }])}
              accessibilityRole="button"
              accessibilityLabel={t.suggestion(c.name, c.email)}
              android_ripple={{ color: theme.colors.surfaceVariant }}
              style={styles.suggestion}
            >
              <Avatar address={c} size={40} />
              <View style={styles.suggestionText}>
                {c.name ? <Text variant="bodyLarge">{c.name}</Text> : null}
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {c.email}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_TOUCH + 8,
    paddingLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { width: 40, fontSize: 16 },
  chips: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 4,
    gap: 6,
  },
  chipText: { flexShrink: 1, fontSize: 14 },
  chipClose: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  input: { flexGrow: 1, minWidth: 80, minHeight: MIN_TOUCH, fontSize: 16, paddingVertical: 8 },
  invalid: { paddingHorizontal: 56, paddingBottom: 4, fontSize: 12 },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingHorizontal: 16,
    gap: 16,
  },
  suggestionText: { flex: 1 },
});
