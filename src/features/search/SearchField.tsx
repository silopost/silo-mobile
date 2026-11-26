import type { ComponentRef, ReactNode, RefObject } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { IconButton } from "react-native-paper";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

type Props = {
  value: string;
  onChange: (text: string) => void;
  /**
   * Enter / the search key of the keyboard, with the text of the native field: the state of the
   * screen may not have caught up yet with the last keystrokes.
   */
  onSubmit: (text: string) => void;
  onBack: () => void;
  /**
   * The user starts editing the query: a tap in the field, typing or "x". Not the focus itself:
   * Android may hand the focus back to the field on its own (the screen remounted by a language
   * switch, keyboard navigation), which must not hide the results.
   */
  onEdit: () => void;
  autoFocus: boolean;
  /** The results of the query are shown (not typing): the Gmail 2026 pill with the query. */
  results: boolean;
  inputRef?: RefObject<SearchInput | null>;
  /** The overflow menu (⋮) at the end of the bar, e.g. "Utwórz filtr z tego wyszukiwania". */
  menu?: ReactNode;
};

/** The native text input of the field (focus, blur). */
export type SearchInput = ComponentRef<typeof TextInput>;

/**
 * The search field of the Gmail app's search screen: back arrow, the query and "x" that clears
 * it. While typing it is a flat bar; over the results the query sits centred in a pill with the
 * arrow and "x" outside it (Gmail 2026). One input in both, so the focus survives the switch. The
 * text goes to the server as typed (no parsing here).
 */
export function SearchField({
  value,
  onChange,
  onSubmit,
  onBack,
  onEdit,
  autoFocus,
  results,
  inputRef,
  menu,
}: Props) {
  const theme = useAppTheme();
  const clear = (label: string) => (
    <IconButton
      icon="close"
      accessibilityLabel={label}
      onPress={() => {
        onChange("");
        inputRef?.current?.focus();
        onEdit();
      }}
      style={styles.icon}
    />
  );
  return (
    <View
      style={[
        styles.bar,
        results
          ? styles.resultsBar
          : [
              styles.typingBar,
              {
                backgroundColor: theme.colors.listCard,
                borderBottomColor: theme.colors.outlineVariant,
              },
            ],
      ]}
    >
      <IconButton
        icon="arrow-left"
        accessibilityLabel={results ? t.back : t.searchBack}
        onPress={onBack}
        style={styles.icon}
      />
      <View
        style={[
          styles.field,
          results && [styles.pill, { backgroundColor: theme.colors.surfaceContainerHigh }],
        ]}
      >
        <TextInput
          ref={inputRef}
          testID="search-input"
          value={value}
          onChangeText={(text) => {
            onChange(text);
            onEdit();
          }}
          onSubmitEditing={(e) => onSubmit(e?.nativeEvent?.text ?? value)}
          onPressIn={onEdit}
          autoFocus={autoFocus}
          placeholder={t.searchMail}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          accessibilityLabel={t.searchMail}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          submitBehavior="blurAndSubmit"
          textAlign={results ? "center" : "left"}
          style={[styles.input, { color: theme.colors.onSurface }]}
        />
        {!results && value.length > 0 && clear(t.clearSearch)}
      </View>
      {results && clear(t.clearSearchText)}
      {menu}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center" },
  // Typing: a flat bar across the screen with a line under it.
  typingBar: { minHeight: 64, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  // Results: arrow 4–52 dp, pill from 60 dp, "x" outside (as the list's search bar).
  resultsBar: { gap: 8, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 },
  field: { flex: 1, flexDirection: "row", alignItems: "center" },
  pill: { height: 56, borderRadius: 28, paddingHorizontal: 16 },
  icon: { margin: 0, width: MIN_TOUCH, height: MIN_TOUCH },
  input: { flex: 1, minHeight: MIN_TOUCH, fontSize: 16, paddingHorizontal: 4 },
});
