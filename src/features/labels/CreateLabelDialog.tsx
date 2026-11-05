import { useState } from "react";
import { Button, Dialog, Portal, TextInput } from "react-native-paper";
import { useCreateLabel } from "../../api/mutations/labels";
import { t } from "../../lib/i18n";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  accountId: string;
};

/** "Nowa etykieta" of the drawer: a name, POST /labels {type: "user"}; no colour yet. */
export function CreateLabelDialog({ visible, onDismiss, accountId }: Props) {
  if (!visible) return null;
  return <CreateLabelContent onDismiss={onDismiss} accountId={accountId} />;
}

function CreateLabelContent({ onDismiss, accountId }: Omit<Props, "visible">) {
  const [name, setName] = useState("");
  const create = useCreateLabel(accountId, onDismiss);
  const submit = () => {
    const trimmed = name.trim();
    if (trimmed && !create.isPending) create.mutate(trimmed);
  };
  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss} testID="create-label-dialog">
        <Dialog.Title>{t.newLabel}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            label={t.labelName}
            accessibilityLabel={t.labelName}
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            autoFocus
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t.cancel}</Button>
          <Button onPress={submit} disabled={!name.trim() || create.isPending}>
            {t.create}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
