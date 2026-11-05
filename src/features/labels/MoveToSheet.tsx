import { StyleSheet, View } from "react-native";
import { Icon, List } from "react-native-paper";
import { ARCHIVE } from "../../api/mutations/threads";
import { useLabels } from "../../api/queries/labels";
import { BottomSheet } from "../../components/BottomSheet";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  accountId: string;
  /** Label of the view the threads are in; that place is shown greyed out. */
  currentLabelId?: string;
  /** The chosen place: INBOX, SPAM, TRASH, ARCHIVE, a folder or a user label id. */
  onSelect: (target: string) => void;
};

type Item = { id: string; name: string; icon: string; color?: string };

const FIXED: Item[] = [
  { id: "INBOX", name: t.locations.INBOX!, icon: "inbox" },
  { id: "SPAM", name: t.locations.SPAM!, icon: "alert-octagon-outline" },
  { id: "TRASH", name: t.locations.TRASH!, icon: "delete-outline" },
  { id: ARCHIVE, name: t.locations.ARCHIVE!, icon: "archive-arrow-down-outline" },
];

/**
 * "Przenieś do" of the Gmail app as a bottom sheet: Odebrane, Spam, Kosz, Archiwum, then the
 * server folders and the user labels (a dot of their colour). A controlled component: the
 * selection bar opens it through run('moveTo'), the thread screen (slice 6) can too.
 */
export function MoveToSheet({ visible, onDismiss, accountId, currentLabelId, onSelect }: Props) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title={t.moveTo} testID="move-to-sheet">
      {visible && (
        <MoveToContent accountId={accountId} currentLabelId={currentLabelId} onSelect={onSelect} />
      )}
    </BottomSheet>
  );
}

function MoveToContent({
  accountId,
  currentLabelId,
  onSelect,
}: Pick<Props, "accountId" | "currentLabelId" | "onSelect">) {
  const theme = useAppTheme();
  const labels = useLabels(accountId);
  const items: Item[] = [
    ...FIXED,
    ...labels
      .filter((l) => l.type === "folder")
      .map((l) => ({ id: l.id, name: l.name, icon: "folder-outline" })),
    ...labels
      .filter((l) => l.type === "user")
      .map((l) => ({
        id: l.id,
        name: l.name,
        icon: l.colorBg ? "circle" : "label-outline",
        color: l.colorBg ?? undefined,
      })),
  ];

  return (
    <View>
      {items.map((item) => {
        const current = item.id === currentLabelId;
        return (
          <List.Item
            key={item.id}
            testID={`move-${item.id}`}
            title={item.name}
            description={current ? t.currentLocation : undefined}
            disabled={current}
            accessibilityState={{ disabled: current }}
            onPress={() => onSelect(item.id)}
            style={current && styles.current}
            left={() => (
              <View style={styles.icon}>
                <Icon
                  source={item.icon}
                  size={item.color ? 16 : 24}
                  color={item.color ?? theme.colors.onSurfaceVariant}
                />
              </View>
            )}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  current: { opacity: 0.38 },
  icon: { width: 24, height: 24, alignItems: "center", justifyContent: "center", marginLeft: 16 },
});
