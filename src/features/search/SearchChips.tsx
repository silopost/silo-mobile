import { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Chip, List } from "react-native-paper";
import { useLabels } from "../../api/queries/labels";
import { BottomSheet } from "../../components/BottomSheet";
import { t } from "../../lib/i18n";
import { pickDate } from "../../lib/pickDateTime";
import {
  dateToQuery,
  hasPart,
  hasPrefix,
  quoteValue,
  togglePart,
  withPart,
  withoutPrefix,
} from "../../lib/searchText";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

type SheetKind = "labels" | "from" | "to" | "subject" | "date";

/** The prefixes of the text a sheet chip writes; a chip is active while the query has one. */
const PREFIXES: Record<SheetKind, string[]> = {
  labels: ["label:"],
  from: ["from:"],
  to: ["to:"],
  subject: ["subject:"],
  date: ["after:", "before:", "older_than:", "newer_than:"],
};

/** On/off chips: one exact piece of text each. */
const TOGGLES = [
  { key: "attachment", part: "has:attachment", icon: "paperclip" },
  { key: "unread", part: "is:unread", icon: "email-outline" },
  { key: "starred", part: "is:starred", icon: "star-outline" },
] as const;

/** Relative dates of the "Data" chip, as Gmail's search language writes them. */
const DATE_PARTS = [
  "older_than:1w",
  "older_than:1m",
  "older_than:6m",
  "older_than:1y",
  "newer_than:7d",
  "newer_than:30d",
];

type Props = {
  accountId: string;
  /** The query as it is now. */
  query: string;
  /** The query with the chip's text added or removed (the screen searches it). */
  onChange: (query: string) => void;
  /**
   * The chips of the filter editor: "Temat" is added, "Nieprzeczytane" and "Oznaczone gwiazdką"
   * are left out (a filter sees new mail, plan 3.11).
   */
  variant?: "search" | "filter";
};

/**
 * The filter chips under the Gmail app's search field: "Etykiety", "Od", "Do", "Data" open a sheet,
 * "Załącznik", "Nieprzeczytane", "Oznaczone gwiazdką" switch at once. A chip only adds or removes
 * a piece of the query text (label:, from:, to:, after:/before:/older_than:, has:attachment,
 * is:unread, is:starred); the server interprets it (plan 2.6, 3.12).
 */
export function SearchChips({ accountId, query, onChange, variant = "search" }: Props) {
  const toggles = variant === "filter" ? TOGGLES.filter((c) => c.key === "attachment") : TOGGLES;
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const close = () => setSheet(null);
  /** Replaces the sheet's parts of the query by `part` (none: just removes them). */
  const replace = (kind: SheetKind, part?: string) => {
    close();
    const rest = withoutPrefix(query, PREFIXES[kind]);
    onChange(part ? withPart(rest, part) : rest);
  };

  const sheetChip = (kind: SheetKind) => {
    const active = hasPrefix(query, PREFIXES[kind]);
    return (
      <Chip
        key={kind}
        testID={`search-chip-${kind}`}
        mode={active ? "flat" : "outlined"}
        selected={active}
        showSelectedCheck={false}
        icon="menu-down"
        accessibilityRole="button"
        onPress={() => setSheet(kind)}
        style={styles.chip}
      >
        {t.searchChips[kind]}
      </Chip>
    );
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
        accessibilityLabel={t.searchFilters}
        style={styles.scroll}
      >
        {sheetChip("labels")}
        {sheetChip("from")}
        {sheetChip("to")}
        {variant === "filter" && sheetChip("subject")}
        {variant === "search" && sheetChip("date")}
        {toggles.map((c) => {
          const active = hasPart(query, c.part);
          return (
            <Chip
              key={c.key}
              testID={`search-chip-${c.key}`}
              mode={active ? "flat" : "outlined"}
              selected={active}
              icon={active ? "check" : c.icon}
              accessibilityRole="switch"
              accessibilityState={{ checked: active }}
              onPress={() => onChange(togglePart(query, c.part))}
              style={styles.chip}
            >
              {t.searchChips[c.key]}
            </Chip>
          );
        })}
      </ScrollView>
      {sheet === "labels" && (
        <LabelsChipSheet
          accountId={accountId}
          active={hasPrefix(query, PREFIXES.labels)}
          onDismiss={close}
          onPick={(part) => replace("labels", part)}
        />
      )}
      {(sheet === "from" || sheet === "to" || sheet === "subject") && (
        <AddressChipSheet
          kind={sheet}
          active={hasPrefix(query, PREFIXES[sheet])}
          onDismiss={close}
          onPick={(part) => replace(sheet, part)}
        />
      )}
      {sheet === "date" && (
        <DateChipSheet
          active={hasPrefix(query, PREFIXES.date)}
          onDismiss={close}
          onPick={(part) => replace("date", part)}
          onPickDay={async (key) => {
            close();
            const day = await pickDate(new Date());
            if (day)
              onChange(withPart(withoutPrefix(query, [`${key}:`]), `${key}:${dateToQuery(day)}`));
          }}
        />
      )}
    </>
  );
}

type SheetProps = {
  active: boolean;
  onDismiss: () => void;
  /** The text to put in the query; undefined clears the chip. */
  onPick: (part?: string) => void;
};

function ClearItem({ onPick }: Pick<SheetProps, "onPick">) {
  return (
    <List.Item
      title={t.clearSearch}
      left={(p) => <List.Icon {...p} icon="close" />}
      onPress={() => onPick()}
    />
  );
}

function LabelsChipSheet({
  accountId,
  active,
  onDismiss,
  onPick,
}: SheetProps & { accountId: string }) {
  const labels = useLabels(accountId).filter((l) => l.type === "user" || l.type === "folder");
  return (
    <BottomSheet
      visible
      onDismiss={onDismiss}
      title={t.searchChips.labels}
      testID="search-labels-sheet"
    >
      {active && <ClearItem onPick={onPick} />}
      {labels.map((l) => (
        <List.Item
          key={l.id}
          title={l.name}
          left={(p) => (
            <List.Icon {...p} icon={l.type === "folder" ? "folder-outline" : "label-outline"} />
          )}
          onPress={() => onPick(`label:${quoteValue(l.name)}`)}
        />
      ))}
    </BottomSheet>
  );
}

function AddressChipSheet({
  kind,
  active,
  onDismiss,
  onPick,
}: SheetProps & { kind: "from" | "to" | "subject" }) {
  const theme = useAppTheme();
  const [value, setValue] = useState("");
  const apply = () => (value.trim() ? onPick(`${kind}:${quoteValue(value)}`) : onDismiss());
  return (
    <BottomSheet
      visible
      onDismiss={onDismiss}
      title={kind === "from" ? t.chipFromTitle : kind === "to" ? t.chipToTitle : t.chipSubjectTitle}
      testID={`search-${kind}-sheet`}
      footer={
        <View style={styles.footer}>
          {active && <Button onPress={() => onPick()}>{t.clearSearch}</Button>}
          <Button mode="contained" onPress={apply} contentStyle={styles.touch}>
            {t.chipApply}
          </Button>
        </View>
      }
    >
      <TextInput
        testID={`search-${kind}-input`}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={apply}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={kind === "subject" ? "default" : "email-address"}
        placeholder={kind === "subject" ? t.chipSubjectHint : t.chipAddressHint}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        accessibilityLabel={kind === "subject" ? t.chipSubjectHint : t.chipAddressHint}
        style={[styles.input, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
      />
    </BottomSheet>
  );
}

function DateChipSheet({
  active,
  onDismiss,
  onPick,
  onPickDay,
}: SheetProps & { onPickDay: (key: "after" | "before") => void }) {
  return (
    <BottomSheet visible onDismiss={onDismiss} title={t.dateChipTitle} testID="search-date-sheet">
      {active && <ClearItem onPick={onPick} />}
      {DATE_PARTS.map((part) => (
        <List.Item
          key={part}
          title={t.dateOptions[part.replace(":", "_")]}
          onPress={() => onPick(part)}
        />
      ))}
      <List.Item
        title={t.dateAfter}
        left={(p) => <List.Icon {...p} icon="calendar-start" />}
        onPress={() => onPickDay("after")}
      />
      <List.Item
        title={t.dateBefore}
        left={(p) => <List.Icon {...p} icon="calendar-end" />}
        onPress={() => onPickDay("before")}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { borderRadius: 8 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 8, padding: 16 },
  touch: { minHeight: MIN_TOUCH },
  input: {
    minHeight: MIN_TOUCH,
    marginHorizontal: 24,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
  },
});
