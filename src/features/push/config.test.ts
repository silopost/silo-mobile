import Constants from "expo-constants";
import { defaultMeta } from "../../test/server";
import { PROJECT_ID, setPushBuild } from "../../test/push";
import { pushBuild, pushUnavailable, type PushBuild } from "./config";

const configured: PushBuild = { projectId: PROJECT_ID, fcm: true, expoGo: false };
const meta = (providers?: string[] | null) => ({
  ...defaultMeta,
  ...(providers !== undefined && { push: { providers } }),
});

afterEach(() => setPushBuild(null));

describe("pushUnavailable", () => {
  it("is available with a server pushing through Expo and a configured build", () => {
    expect(pushUnavailable(meta(["expo"]), configured)).toBeNull();
  });

  it("waits for GET /meta", () => {
    expect(pushUnavailable(undefined, configured)).toBe("loading");
  });

  it("blames the server without push, with push off or with another provider", () => {
    expect(pushUnavailable(meta(), configured)).toBe("server");
    expect(pushUnavailable(meta([]), configured)).toBe("server");
    expect(pushUnavailable(meta(null), configured)).toBe("server");
    expect(pushUnavailable(meta(["fcm"]), configured)).toBe("server");
  });

  it("blames the build without a project id or without Firebase on Android", () => {
    expect(pushUnavailable(meta(["expo"]), { ...configured, projectId: undefined })).toBe("build");
    expect(pushUnavailable(meta(["expo"]), { ...configured, fcm: false })).toBe("build");
  });

  it("is unavailable in Expo Go", () => {
    expect(pushUnavailable(meta(["expo"]), { ...configured, expoGo: true })).toBe("expoGo");
  });
});

describe("pushBuild", () => {
  it("reads extra.eas.projectId and extra.push.fcm of the app config", () => {
    setPushBuild({});
    expect(pushBuild()).toEqual({ projectId: PROJECT_ID, fcm: true, expoGo: false });
  });

  it("has neither without the environment variables at build time", () => {
    setPushBuild(null);
    expect(pushBuild()).toEqual({ projectId: undefined, fcm: false, expoGo: false });
  });

  it("recognises Expo Go", () => {
    const original = Constants.executionEnvironment;
    Object.assign(Constants, { executionEnvironment: "storeClient" });
    try {
      expect(pushBuild().expoGo).toBe(true);
    } finally {
      Object.assign(Constants, { executionEnvironment: original });
    }
  });
});
