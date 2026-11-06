import type { ComponentRef, ReactNode, RefObject } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { IconButton } from "react-native-paper";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

type Props = {
  value: string;
  onChange: (text: string) => void;
  /** Enter / the search key of the keyboard. */
  onSubmit: () => void;
  onBack: () => void;
  onFocus: () => void;
  autoFocus: boolean;
  inputRef?: RefObject<SearchInput | null>;
  /** The overflow menu (⋮) at the end of the field, e.g. "Utwórz filtr z tego wyszukiwania". */
  menu?: ReactNode;
};

/** The native text input of the field (focus, blur). */
export type SearchInput = ComponentRef<typeof TextInput>;

/**
 * The search field of the Gmail app's search screen: back arrow, the query being typed and "x"
 * that clears it. The text goes to the server as typed (no parsing here).
 */
export function SearchField({
  value,
  onChange,
  onSubmit,
  onBack,
  onFocus,
  autoFocus,
  inputRef,
  menu,
}: Props) {
  const theme = useAppTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
      <IconButton
        icon="arrow-left"
        accessibilityLabel={t.searchBack}
        onPress={onBack}
        style={styles.icon}
      />
      <TextInput
        ref={inputRef}
        testID="search-input"
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        onFocus={onFocus}
        autoFocus={autoFocus}
        placeholder={t.searchMail}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        accessibilityLabel={t.searchMail}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        submitBehavior="blurAndSubmit"
        style={[styles.input, { color: theme.colors.onSurface }]}
      />
      {value.length > 0 && (
        <IconButton
          icon="close"
          accessibilityLabel={t.clearSearch}
          onPress={() => {
            onChange("");
            inputRef?.current?.focus();
            onFocus();
          }}
          style={styles.icon}
        />
      )}
      {menu}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 28,
    paddingHorizontal: 4,
  },
  icon: { margin: 0, width: MIN_TOUCH, height: MIN_TOUCH },
  input: { flex: 1, minHeight: MIN_TOUCH, fontSize: 16, paddingHorizontal: 4 },
});
