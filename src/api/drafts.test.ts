import { http, HttpResponse } from "msw";
import { useAuth } from "../state/auth";
import { API, SERVER_URL, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";
import { FakeXhr } from "../test/xhr";
import {
  MAX_PARALLEL_UPLOADS,
  isAbortError,
  queueUpload,
  saveDraft,
  uploadConfig,
  uploadFile,
} from "./drafts";
import { isApiError } from "./errors";

setupMsw();

const file = { uri: "file:///cache/a.pdf", name: "a.pdf", type: "application/pdf", size: 10 };
const createXhr = uploadConfig.createXhr;

beforeEach(() => {
  resetAuth();
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
  uploadConfig.createXhr = () => new FakeXhr() as unknown as XMLHttpRequest;
});
afterEach(() => {
  uploadConfig.createXhr = createXhr;
});

/** Waits until the upload opened its request (clientId() resolves first). */
async function opened(): Promise<FakeXhr> {
  FakeXhr.last = undefined;
  const last = (): FakeXhr | undefined => FakeXhr.last;
  for (let i = 0; i < 50 && !last()?.method; i++) await new Promise((r) => setTimeout(r, 1));
  return last()!;
}

describe("uploadFile", () => {
  it("posts multipart to /uploads with the bearer and client headers and reports progress", async () => {
    const progress: number[] = [];
    const xhrP = opened();
    const done = uploadFile(file, (p) => progress.push(p));
    const xhr = await xhrP;

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe(`${API}/uploads`);
    expect(xhr.headers.Authorization).toBe("Bearer tok_1");
    expect(xhr.headers["X-Silo-Client"]).toMatch(/^silo-mobile\//);
    expect(xhr.body).toBeInstanceOf(FormData);

    xhr.progress(5, 10);
    const info = { id: "up_1", filename: "a.pdf", contentType: "application/pdf", size: 10 };
    xhr.respond(201, info);

    await expect(done).resolves.toEqual(info);
    expect(progress).toEqual([0.5, 1]);
  });

  it("sends inline=true before the file for a picture in the body", async () => {
    const xhrP = opened();
    const done = uploadFile(file, () => undefined, undefined, true);
    const xhr = await xhrP;
    expect([...(xhr.body as FormData).keys()]).toEqual(["inline", "file"]);
    expect((xhr.body as FormData).get("inline")).toBe("true");
    xhr.respond(201, { id: "u_9", cid: "c9@silo", inline: true });
    await expect(done).resolves.toMatchObject({ cid: "c9@silo" });
  });

  it("rejects 413 upload_too_large with limit and size of the problem", async () => {
    const xhrP = opened();
    const done = uploadFile(file, () => undefined);
    (await xhrP).respond(413, { status: 413, code: "upload_too_large", limit: 5, size: 10 });

    const err = await done.catch((e: unknown) => e);
    expect(isApiError(err, 413)).toBe(true);
    if (!isApiError(err)) return;
    expect(err.code).toBe("upload_too_large");
    expect(err.problem?.limit).toBe(5);
    expect(err.problem?.size).toBe(10);
  });

  it("aborts with an AbortError when the signal fires", async () => {
    const abort = new AbortController();
    const xhrP = opened();
    const done = uploadFile(file, () => undefined, abort.signal);
    await xhrP;
    abort.abort();
    expect(isAbortError(await done.catch((e: unknown) => e))).toBe(true);
  });
});

describe("queueUpload", () => {
  it("runs at most three uploads at once", async () => {
    let active = 0;
    let peak = 0;
    const gates: (() => void)[] = [];
    const task = () =>
      new Promise<void>((resolve) => {
        active += 1;
        peak = Math.max(peak, active);
        gates.push(() => {
          active -= 1;
          resolve();
        });
      });
    const all = Promise.all(Array.from({ length: 5 }, () => queueUpload(task)));
    await new Promise((r) => setTimeout(r, 1));
    expect(active).toBe(MAX_PARALLEL_UPLOADS);
    while (gates.length) {
      gates.shift()!();
      await new Promise((r) => setTimeout(r, 1));
    }
    await all;
    expect(peak).toBe(MAX_PARALLEL_UPLOADS);
  });
});

describe("saveDraft", () => {
  it("sends the version, recipients without empty names and syncNow", async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put(`${API}/drafts/d_1`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: "d_1", version: 4 });
      }),
    );
    await saveDraft(
      "d_1",
      3,
      {
        to: [{ email: "jan@example.com", name: "" }],
        cc: [{ email: "ola@example.com", name: "Ola" }],
        bcc: [],
        subject: "S",
        bodyHtml: "<p>x</p>",
        bodyJson: null,
        attachmentIds: ["up_1"],
      },
      true,
    );
    expect(body).toEqual({
      version: 3,
      to: [{ email: "jan@example.com" }],
      cc: [{ email: "ola@example.com", name: "Ola" }],
      bcc: [],
      subject: "S",
      bodyHtml: "<p>x</p>",
      attachmentIds: ["up_1"],
      syncNow: true,
    });
  });
});
