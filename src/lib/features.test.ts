import { compareVersions, hasServerFeature } from "./features";

describe("compareVersions", () => {
  it("orders by major, minor and patch", () => {
    expect(compareVersions("0.4.0", "0.3.0")).toBeGreaterThan(0);
    expect(compareVersions("0.3.9", "0.4.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "0.10.0")).toBeGreaterThan(0);
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("v0.4.0", "0.4.0")).toBe(0);
    expect(compareVersions("0.4", "0.4.0")).toBe(0);
  });

  it("counts a pre-release as its release and an unparsable version as the newest", () => {
    expect(compareVersions("0.4.0-rc.1", "0.4.0")).toBe(0);
    expect(compareVersions("dev", "0.4.0")).toBeGreaterThan(0);
    expect(compareVersions("", "9.9.9")).toBeGreaterThan(0);
    expect(compareVersions("0.4.0", "dev")).toBeLessThan(0);
  });
});

describe("hasServerFeature", () => {
  it("enables phase 4 features from server 0.4.0", () => {
    expect(hasServerFeature({ serverVersion: "0.3.0" }, "search")).toBe(false);
    expect(hasServerFeature({ serverVersion: "0.3.7" }, "snooze")).toBe(false);
    expect(hasServerFeature({ serverVersion: "0.4.0" }, "search")).toBe(true);
    expect(hasServerFeature({ serverVersion: "0.5.1" }, "schedule")).toBe(true);
    expect(hasServerFeature({ serverVersion: "1.0.0" }, "filters")).toBe(true);
  });

  it("treats a dev or empty version as the newest and an unknown server as the oldest", () => {
    expect(hasServerFeature({ serverVersion: "dev" }, "settings")).toBe(true);
    expect(hasServerFeature({ serverVersion: "" }, "snooze")).toBe(true);
    expect(hasServerFeature(undefined, "search")).toBe(false);
  });
});
