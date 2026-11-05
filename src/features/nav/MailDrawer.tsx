import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, Icon, Text, TouchableRipple } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Label } from "../../api/queries/labels";
import { formatCount } from "../../lib/format";
import { t } from "../../lib/i18n";
import { isListed, systemCount, SYSTEM_VIEWS, type IconName } from "../../lib/labels";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

type ItemProps = {
  label: string;
  icon: IconName;
  /** Tint of the icon (label colour); the default icon colour otherwise. */
  iconColor?: string | null;
  count?: number;
  countKind?: "unread" | "total";
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
};

/** Entry of the drawer: icon, name, counter; the active one sits on the MD3 pill. */
export function DrawerItem({
  label,
  icon,
  iconColor,
  count = 0,
  countKind = "unread",
  active = false,
  disabled = false,
  onPress,
  testID,
}: ItemProps) {
  const theme = useAppTheme();
  const color = active ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant;
  const a11yCount =
    count > 0 ? `, ${countKind === "unread" ? t.unreadCount(count) : t.totalCount(count)}` : "";
  const bold = countKind === "unread" && count > 0;
  return (
    <TouchableRipple
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}${a11yCount}`}
      accessibilityHint={disabled ? t.comingSoon : undefined}
      accessibilityState={{ selected: active, disabled }}
      borderless
      style={[
        styles.item,
        active && { backgroundColor: theme.colors.secondaryContainer },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.row}>
        <Icon source={icon} size={24} color={iconColor ?? color} />
        <Text
          variant="labelLarge"
          numberOfLines={1}
          style={[styles.name, { color }, (active || bold) && styles.bold]}
        >
          {label}
        </Text>
        {count > 0 && (
          <Text variant="labelMedium" style={[{ color }, bold && styles.bold]}>
            {formatCount(count)}
          </Text>
        )}
      </View>
    </TouchableRipple>
  );
}

type Props = {
  labels: Label[];
  /** [label] segment of the shown list; undefined outside label lists (search). */
  activeSlug: string | undefined;
  onSelect: (slug: string) => void;
  onCreateLabel: () => void;
  onSettings: () => void;
};

/**
 * Content of the navigation drawer as in the Gmail app (plan 6.3): the logotype, system views with
 * their counters, the user's labels and server folders, "Utwórz nową", settings and help.
 */
export function MailDrawer({ labels, activeSlug, onSelect, onCreateLabel, onSettings }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const userLabels = labels.filter((l) => l.type === "user" && isListed(l));
  const folders = labels.filter((l) => l.type === "folder" && isListed(l));

  return (
    <ScrollView
      accessibilityLabel={t.mainMenu}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 8 }}
    >
      <View style={styles.header}>
        <Icon source="email-outline" size={28} color={theme.colors.brand} />
        <Text
          variant="titleLarge"
          accessibilityRole="header"
          style={[styles.logo, { color: theme.colors.onSurfaceVariant }]}
        >
          {t.appName}
        </Text>
      </View>
      <Divider style={styles.divider} />

      {SYSTEM_VIEWS.map((v) => (
        <DrawerItem
          key={v.slug}
          testID={`nav-${v.slug}`}
          label={v.name}
          icon={v.icon}
          count={systemCount(v, labels)}
          countKind={v.count}
          active={activeSlug === v.slug}
          onPress={() => onSelect(v.slug)}
        />
      ))}

      <LabelSection
        title={t.labels}
        labels={userLabels}
        icon="label-outline"
        activeSlug={activeSlug}
        onSelect={onSelect}
      />
      <DrawerItem label={t.createLabel} icon="plus" onPress={onCreateLabel} />
      {folders.length > 0 && (
        <LabelSection
          title={t.folders}
          labels={folders}
          icon="folder-outline"
          activeSlug={activeSlug}
          onSelect={onSelect}
        />
      )}

      <Divider style={styles.divider} />
      <DrawerItem label={t.settings} icon="cog-outline" onPress={onSettings} />
      <DrawerItem label={t.helpFeedback} icon="help-circle-outline" disabled />
    </ScrollView>
  );
}

function LabelSection(props: {
  title: string;
  labels: Label[];
  icon: IconName;
  activeSlug: string | undefined;
  onSelect: (slug: string) => void;
}) {
  const theme = useAppTheme();
  return (
    <View accessibilityLabel={props.title}>
      <Text
        variant="labelLarge"
        accessibilityRole="header"
        style={[styles.section, { color: theme.colors.onSurfaceVariant }]}
      >
        {props.title}
      </Text>
      {props.labels.map((l) => (
        <DrawerItem
          key={l.id}
          testID={`nav-${l.id}`}
          label={l.name}
          // A coloured label shows as a dot of its colour, as in Gmail.
          icon={l.colorBg ? "circle" : props.icon}
          iconColor={l.colorBg}
          count={l.threadsUnread}
          active={props.activeSlug === l.id}
          onPress={() => props.onSelect(l.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    minHeight: 64,
  },
  logo: { fontWeight: "500" },
  divider: { marginVertical: 8 },
  // Full height 56 dp (MD3 navigation drawer), pill rounded on the right end like Gmail.
  item: {
    minHeight: Math.max(MIN_TOUCH, 52),
    justifyContent: "center",
    marginRight: 12,
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingLeft: 24, paddingRight: 16 },
  name: { flex: 1 },
  bold: { fontWeight: "700" },
  disabled: { opacity: 0.5 },
  section: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
});
