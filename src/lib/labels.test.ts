import { label } from "../test/fixtures";
import { formatCount, initial } from "./format";
import {
  isListed,
  labelTree,
  resolveLabelSlug,
  subtree,
  systemCount,
  SYSTEM_VIEWS,
  viewName,
} from "./labels";

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

describe("label tree", () => {
  const l = (id: string, name: string, parentId: string | null = null, position = 0) =>
    label({ id, name, parentId, position, type: "user" });
  const all = [
    l("l_3", "Klienci", "l_1"),
    l("l_1", "Praca"),
    l("l_2", "Dom", null, 1),
    l("l_4", "ACME", "l_3"),
  ];

  it("orders labels depth-first with their depth", () => {
    expect(labelTree(all).map((x) => `${x.depth}:${x.label.name}`)).toEqual([
      "0:Praca",
      "1:Klienci",
      "2:ACME",
      "0:Dom",
    ]);
  });

  it("finds the labels that cannot become a parent", () => {
    expect([...subtree(all, "l_1")].sort()).toEqual(["l_1", "l_3", "l_4"]);
  });
});
