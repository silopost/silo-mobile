import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

type Mode = "date" | "time";

/** Opens Android's native date or time dialog; resolves the chosen value, or null when dismissed. */
function open(mode: Mode, value: Date, minimumDate?: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      mode,
      value,
      minimumDate: mode === "date" ? minimumDate : undefined,
      is24Hour: true,
      onValueChange: (_event, date) => resolve(date),
      onDismiss: () => resolve(null),
    });
  });
}

/** "Data" of the search chips: a day (the time of the day is kept from `initial`). */
export function pickDate(initial: Date, minimumDate?: Date): Promise<Date | null> {
  return open("date", initial, minimumDate);
}

/**
 * "Wybierz datę i godzinę" (snooze, scheduled send): the date dialog, then the time dialog, as
 * the Gmail app does. Only a proposal: the server validates the time (422) and acts on it.
 */
export async function pickDateTime(initial: Date, minimumDate?: Date): Promise<Date | null> {
  const day = await open("date", initial, minimumDate);
  if (!day) return null;
  return open("time", day);
}
