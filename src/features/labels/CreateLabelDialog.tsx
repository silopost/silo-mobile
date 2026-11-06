import { useCreateLabel, type NewLabel } from "../../api/mutations/labels";
import { useLabels } from "../../api/queries/labels";
import { useServerFeature } from "../../lib/features";
import { t } from "../../lib/i18n";
import { LabelDialog, type LabelFields } from "./LabelDialog";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  accountId: string;
};

/**
 * "Nowa etykieta" of the drawer and the labels screen: a name, POST /labels {type: "user"}; with
 * server 0.4.0 also a colour of the palette and a parent label.
 */
export function CreateLabelDialog({ visible, onDismiss, accountId }: Props) {
  if (!visible) return null;
  return <CreateLabelContent onDismiss={onDismiss} accountId={accountId} />;
}

/** The body of POST /labels for the fields of the dialog (only what was chosen). */
export function newLabelBody(f: LabelFields): NewLabel {
  return {
    name: f.name,
    ...(f.color ? { colorBg: f.color.bg, colorText: f.color.text } : {}),
    ...(f.parentId ? { parentId: f.parentId } : {}),
  };
}

function CreateLabelContent({ onDismiss, accountId }: Omit<Props, "visible">) {
  const extended = useServerFeature("labels");
  const labels = useLabels(accountId).filter((l) => l.type === "user");
  const create = useCreateLabel(accountId, onDismiss);
  return (
    <LabelDialog
      testID="create-label-dialog"
      title={t.newLabel}
      labels={labels}
      extended={extended}
      submitLabel={t.create}
      busy={create.isPending}
      onSubmit={(f) => create.mutate(extended ? newLabelBody(f) : f.name)}
      onDismiss={onDismiss}
    />
  );
}
