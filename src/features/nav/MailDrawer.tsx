import { Fragment } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, Icon, Text, TouchableRipple } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Label } from "../../api/queries/labels";
import { formatCount } from "../../lib/format";
import { t } from "../../lib/i18n";
import { isListed, labelTree, systemCount, SYSTEM_VIEWS, type IconName } from "../../lib/labels";
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
  /** Nesting of a label under its parent (Label.parentId): indented by 16 dp a level. */
  depth?: number;
  onPress?: () => void;
  testID?: string;
};

/**
 * Entry of the drawer as in the Gmail app (2026): 48 dp, icon at 24 dp and name at 72 dp; the
 * active one sits on a pill 8 dp from both edges, in regular weight (an unread count of another
 * entry is bold).
 */
export function DrawerItem({
  label,
  icon,
  iconColor,
  count = 0,
  countKind = "unread",
  active = false,
  disabled = false,
  depth = 0,
  onPress,
  testID,
}: ItemProps) {
  const theme = useAppTheme();
  const color = active ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant;
  const a11yCount =
    count > 0 ? `, ${countKind === "unread" ? t.unreadCount(count) : t.totalCount(count)}` : "";
  const bold = countKind === "unread" && count > 0 && !active;
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
      <View style={[styles.row, depth > 0 && { paddingLeft: 16 + depth * 16 }]}>
        <Icon source={icon} size={24} color={iconColor ?? color} />
        <Text
          variant="bodyLarge"
          numberOfLines={1}
          style={[styles.name, { color }, bold && styles.bold]}
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
 * Content of the navigation drawer as in the Gmail app (plan 6.3): the logotype, the Inbox, "Wszystkie
 * etykiety" with the other system views and their counters, the user's labels ending with "Utwórz
 * etykietę", server folders, settings and help.
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

      {SYSTEM_VIEWS.map((v, i) => (
        <Fragment key={v.slug}>
          <DrawerItem
            testID={`nav-${v.slug}`}
            label={v.name}
            icon={v.icon}
            count={systemCount(v, labels)}
            countKind={v.count}
            active={activeSlug === v.slug}
            onPress={() => onSelect(v.slug)}
          />
          {i === 0 && (
            <Text
              variant="labelLarge"
              accessibilityRole="header"
              style={[styles.section, { color: theme.colors.onSurfaceVariant }]}
            >
              {t.allLabels}
            </Text>
          )}
        </Fragment>
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
      {labelTree(props.labels).map(({ label: l, depth }) => (
        <DrawerItem
          depth={depth}
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
  // 48 dp; the pill 8 dp from both edges, fully rounded (Gmail 2026).
  item: {
    minHeight: MIN_TOUCH,
    justifyContent: "center",
    marginHorizontal: 8,
    borderRadius: MIN_TOUCH / 2,
    overflow: "hidden",
  },
  // Icon 24 dp and text 72 dp from the drawer's edge.
  row: { flexDirection: "row", alignItems: "center", gap: 24, paddingLeft: 16, paddingRight: 16 },
  name: { flex: 1 },
  bold: { fontWeight: "700" },
  disabled: { opacity: 0.5 },
  section: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
});
