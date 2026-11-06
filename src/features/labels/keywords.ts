import { useQuery } from "@tanstack/react-query";
import { syncStatusQuery } from "../../api/queries/syncStatus";
import type { Label } from "../../api/types";
import { t } from "../../lib/i18n";

/**
 * Names of the account's server folders by f_ id: from the folder labels of GET /labels
 * (`folderId`), completed by GET /accounts/{id}/sync-status (folders without a label, e.g.
 * ignored ones).
 */
export function useFolderNames(accountId: string, labels: Label[]): Map<string, string> {
  const folders = useQuery({ ...syncStatusQuery(accountId), enabled: !!accountId }).data?.folders;
  const names = new Map((folders ?? []).map((f) => [f.id, f.name]));
  for (const l of labels) if (l.type === "folder" && l.folderId) names.set(l.folderId, l.name);
  return names;
}

/**
 * The warning of a user label whose keyword is not (everywhere) on the mail server (plan 3.7,
 * Label.keywordState of server 0.4.0); null when it is mirrored or the state is unknown.
 */
export function keywordWarning(label: Label, folderNames: Map<string, string>): string | null {
  if (label.type !== "user") return null;
  if (label.keywordState === "local_only") return t.labelLocalOnly;
  if (label.keywordState === "partial") {
    const names = (label.localOnlyFolders ?? []).map((id) => folderNames.get(id) ?? id);
    return t.labelPartial(names.join(", "));
  }
  return null;
}
