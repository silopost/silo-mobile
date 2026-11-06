import { List } from "react-native-paper";
import { BottomSheet } from "../../components/BottomSheet";
import { formatWhen } from "../../lib/format";
import { t } from "../../lib/i18n";
import { pickDateTime } from "../../lib/pickDateTime";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** The chosen send time (RFC 3339). */
  onSelect: (sendAt: string) => void;
};

type Preset = { key: keyof typeof t.schedulePresets; at: Date };

/** A day `days` ahead of `now` at `hour`:00 on the device's clock. */
function at(now: Date, days: number, hour: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Gmail's suggestions of "Zaplanuj wysyłkę": tomorrow 8:00 and 13:00, next Monday 8:00, on the
 * device's clock. Only proposals: the contract has no send presets (silo-web borrows the snooze
 * presets), and the server validates and keeps the time.
 */
export function schedulePresets(now = new Date()): Preset[] {
  const toMonday = (8 - now.getDay()) % 7 || 7;
  return [
    { key: "tomorrowMorning", at: at(now, 1, 8) },
    { key: "tomorrowAfternoon", at: at(now, 1, 13) },
    { key: "mondayMorning", at: at(now, toMonday, 8) },
  ];
}

/** "Zaplanuj wysyłkę" of the Gmail app: the presets and "Wybierz datę i godzinę". */
export function ScheduleSendSheet({ visible, onDismiss, onSelect }: Props) {
  if (!visible) return null;
  const custom = async () => {
    const picked = await pickDateTime(at(new Date(), 1, 8), new Date());
    if (picked) onSelect(picked.toISOString());
    else onDismiss();
  };
  return (
    <BottomSheet visible onDismiss={onDismiss} title={t.scheduleSend} testID="schedule-sheet">
      {schedulePresets().map((p) => (
        <List.Item
          key={p.key}
          testID={`schedule-${p.key}`}
          title={t.schedulePresets[p.key]}
          description={formatWhen(p.at.toISOString())}
          left={(props) => <List.Icon {...props} icon="send-clock-outline" />}
          onPress={() => onSelect(p.at.toISOString())}
        />
      ))}
      <List.Item
        testID="schedule-custom"
        title={t.pickDateTime}
        left={(props) => <List.Icon {...props} icon="calendar-clock" />}
        onPress={() => void custom()}
      />
    </BottomSheet>
  );
}
