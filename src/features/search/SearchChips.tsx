import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Icon, List, Text } from "react-native-paper";
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
  { key: "attachment", part: "has:attachment" },
  { key: "unread", part: "is:unread" },
  { key: "starred", part: "is:starred" },
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
      <FilterChip
        key={kind}
        testID={`search-chip-${kind}`}
        label={t.searchChips[kind]}
        active={active}
        menu
        onPress={() => setSheet(kind)}
      />
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
            <FilterChip
              key={c.key}
              testID={`search-chip-${c.key}`}
              label={t.searchChips[c.key]}
              active={active}
              onPress={() => onChange(togglePart(query, c.part))}
            />
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

type FilterChipProps = {
  label: string;
  active: boolean;
  /** Opens a sheet: a button with ▾ after the text; otherwise an on/off switch (✓ when on). */
  menu?: boolean;
  onPress: () => void;
  testID: string;
};

/**
 * A filter chip of Gmail's search: outlined, 8 dp corners, the ▾ of a sheet chip right of the
 * text (Paper's Chip only has a leading icon). The visible chip is 32 dp high in a 48 dp touch
 * target; an active chip is filled.
 */
function FilterChip({ label, active, menu, onPress, testID }: FilterChipProps) {
  const theme = useAppTheme();
  const color = active ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={menu ? "button" : "switch"}
      accessibilityLabel={label}
      accessibilityState={menu ? { selected: active } : { checked: active }}
      onPress={onPress}
      style={styles.chipTouch}
    >
      <View
        style={[
          styles.chip,
          menu && styles.chipMenu,
          active
            ? { backgroundColor: theme.colors.secondaryContainer, borderColor: "transparent" }
            : { borderColor: theme.colors.outline },
        ]}
      >
        {!menu && active && <Icon source="check" size={18} color={color} />}
        <Text variant="bodyMedium" style={{ color }}>
          {label}
        </Text>
        {menu && <Icon source="menu-down" size={18} color={color} />}
      </View>
    </Pressable>
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
      closeLabel={t.exitSearchFilter}
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
      closeLabel={t.exitSearchFilter}
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
    <BottomSheet
      visible
      closeLabel={t.exitSearchFilter}
      onDismiss={onDismiss}
      title={t.dateChipTitle}
      testID="search-date-sheet"
    >
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
  row: { gap: 8, paddingHorizontal: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipMenu: { paddingRight: 8 },
  chipTouch: { minHeight: MIN_TOUCH, justifyContent: "center" },
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
