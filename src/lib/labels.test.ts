import type { Label } from "../api/queries/labels";
import { formatCount, initial } from "./format";
import { isListed, resolveLabelSlug, systemCount, SYSTEM_VIEWS, viewName } from "./labels";

const label = (over: Partial<Label>): Label => ({
  accountId: "acc_1",
  colorBg: null,
  colorText: null,
  folderId: null,
  id: "INBOX",
  keywordState: null,
  name: "INBOX",
  parentId: null,
  position: 0,
  showInList: "show",
  threadsTotal: 0,
  threadsUnread: 0,
  type: "system",
  ...over,
});

describe("labels", () => {
  it("resolves system slugs and label ids", () => {
    expect(resolveLabelSlug("starred")).toMatchObject({ kind: "system" });
    expect(resolveLabelSlug("l_7")).toEqual({ kind: "label", labelId: "l_7" });
    expect(resolveLabelSlug("nope")).toEqual({ kind: "unknown" });
    expect(viewName("l_7", [label({ id: "l_7", name: "Praca", type: "user" })])).toBe("Praca");
  });

  it("counts unread or total threads as the view says", () => {
    const labels = [
      label({ id: "INBOX", threadsUnread: 3, threadsTotal: 50 }),
      label({ id: "DRAFT", threadsUnread: 0, threadsTotal: 2 }),
    ];
    const view = (slug: string) => SYSTEM_VIEWS.find((v) => v.slug === slug)!;
    expect(systemCount(view("inbox"), labels)).toBe(3);
    expect(systemCount(view("drafts"), labels)).toBe(2);
    expect(systemCount(view("starred"), labels)).toBe(0);
  });

  it("lists labels by showInList", () => {
    expect(isListed(label({ showInList: "hide" }))).toBe(false);
    expect(isListed(label({ showInList: "show_if_unread" }))).toBe(false);
    expect(isListed(label({ showInList: "show_if_unread", threadsUnread: 1 }))).toBe(true);
  });
});

describe("format", () => {
  it("caps counters at 99+ like Gmail", () => {
    expect(formatCount(5)).toBe("5");
    expect(formatCount(99)).toBe("99");
    expect(formatCount(100)).toBe("99+");
  });

  it("takes the initial of the name or the address", () => {
    expect(initial({ email: "ala@example.com", name: "" })).toBe("A");
    expect(initial({ email: "x@example.com", name: "bolek" })).toBe("B");
  });
});
