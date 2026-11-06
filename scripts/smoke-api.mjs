// Read-only smoke test of a live silo-server, done the way silo-mobile talks to it: bearer session
// (ADR 0007), X-Silo-Client, the reads of the start screen, a thread, its HTML and the events.
// Nothing is modified except creating and deleting this script's own bearer session.
//
//   SILO_URL=http://localhost:8090 SILO_EMAIL=... SILO_PASSWORD=... npm run smoke:api
//
// Env: SILO_URL, SILO_EMAIL, SILO_PASSWORD (required), SILO_DEVICE (session name, default "smoke").
// Prints a table step -> status -> ms with counts only (no mail content, no secrets). Exit code 1
// when a step fails or the server does not answer.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const { version } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

const serverUrl = (process.env.SILO_URL ?? "").replace(/\/+$/, "");
const email = process.env.SILO_EMAIL ?? "";
const password = process.env.SILO_PASSWORD ?? "";
const device = process.env.SILO_DEVICE || "smoke";
if (!serverUrl || !email || !password) {
  console.error("smoke-api: set SILO_URL, SILO_EMAIL and SILO_PASSWORD");
  process.exit(2);
}

const base = `${serverUrl}/api/v1`;
const clientHeader = `silo-mobile/${version}#smoke`;
const rows = [];
let token;
let failed = false;

/** One request; records the row and returns {status, body} (body: parsed JSON or text). */
async function step(name, method, path, { body, expect = [200], text = false, note } = {}) {
  const headers = { "X-Silo-Client": clientHeader, Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const started = performance.now();
  let status = 0;
  let parsed;
  let error;
  try {
    const res = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    status = res.status;
    const raw = await res.text();
    parsed = text ? raw : raw ? safeJson(raw) : undefined;
  } catch (err) {
    error = err.cause?.code ?? err.name ?? String(err);
  }
  const ms = Math.round(performance.now() - started);
  const ok = expect.includes(status);
  if (!ok) failed = true;
  let detail = "";
  if (error) detail = `no answer (${error})`;
  else if (!ok)
    detail = `expected ${expect.join("/")}${parsed?.code ? `, code ${parsed.code}` : ""}`;
  else if (note) detail = note(parsed);
  rows.push({ step: `${method} ${name}`, status: error ? "—" : String(status), ms, detail });
  return { status, body: parsed, ok, error };
}

function safeJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Same rule as src/lib/features.ts: MAJOR.MINOR.PATCH, unparsable ("dev", "") = newest. */
function atLeast(versionString, min) {
  const parse = (v) => {
    const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(v ?? "").trim());
    return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
  };
  const a = parse(versionString);
  const b = parse(min);
  if (!a) return true;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

const q = (params) => `?${new URLSearchParams(params)}`;

async function run() {
  const meta = await step("/meta", "GET", "/meta", {
    note: (m) => `serverVersion ${m?.serverVersion ?? "?"}, api ${m?.apiVersion ?? "?"}`,
  });
  if (meta.error) return;
  const serverVersion = meta.body?.serverVersion ?? "";

  const login = await step("/session", "POST", "/session", {
    body: { email, password, client: { kind: "bearer", name: device } },
    expect: [200, 201],
    note: (s) => (s?.token ? "bearer token received" : "no token"),
  });
  token = login.body?.token;
  if (!token) {
    failed = true;
    return;
  }

  await step("/session", "GET", "/session", {
    note: (s) => `${s?.accounts?.length ?? 0} accounts`,
  });
  const accounts = await step("/accounts", "GET", "/accounts", {
    note: (a) => `${a?.accounts?.length ?? 0} accounts`,
  });
  const accountId = accounts.body?.accounts?.[0]?.id;
  if (!accountId) {
    failed = true;
    rows.push({ step: "(no account)", status: "—", ms: 0, detail: "nothing to read" });
    return;
  }

  await step("/labels?accountId=", "GET", `/labels${q({ accountId })}`, {
    note: (l) => `${l?.labels?.length ?? 0} labels`,
  });
  const threads = await step(
    "/threads?labelId=INBOX&limit=5",
    "GET",
    `/threads${q({ accountId, labelId: "INBOX", limit: "5" })}`,
    { note: (t) => `${t?.threads?.length ?? 0} threads, ~${t?.resultSizeEstimate ?? 0} in view` },
  );
  const threadId = threads.body?.threads?.[0]?.id;
  if (threadId) {
    const thread = await step("/threads/{id}", "GET", `/threads/${encodeURIComponent(threadId)}`, {
      note: (t) => `${t?.messages?.length ?? 0} messages`,
    });
    const messageId = thread.body?.messages?.[0]?.id;
    if (messageId) {
      // 503 = body not downloaded yet (Retry-After); still an answer of the API.
      await step("/messages/{id}/html", "GET", `/messages/${encodeURIComponent(messageId)}/html`, {
        text: true,
        expect: [200, 503],
        note: (html) => {
          const hasScript = /<script/i.test(html ?? "");
          if (hasScript) failed = true;
          return `${(html ?? "").length} chars, <script: ${hasScript ? "YES (unexpected)" : "no"}`;
        },
      });
    }
  } else {
    rows.push({ step: "GET /threads/{id}", status: "—", ms: 0, detail: "skipped: Inbox empty" });
  }

  await step(
    "/events/poll?after=0&limit=1",
    "GET",
    `/events/poll${q({ after: "0", limit: "1" })}`,
    {
      note: (e) => `${e?.events?.length ?? 0} events`,
    },
  );

  if (atLeast(serverVersion, "0.4.0")) {
    await step("/search/suggest?q=te", "GET", `/search/suggest${q({ q: "te", accountId })}`, {
      note: (s) => `${s?.suggestions?.length ?? 0} suggestions`,
    });
    await step("/snooze/presets", "GET", "/snooze/presets", {
      note: (p) => `${p?.presets?.length ?? 0} presets, zone ${p?.timezone ?? "?"}`,
    });
    await step("/settings", "GET", "/settings", {
      note: (s) => `density ${s?.density ?? "?"}`,
    });
    await step("/filters?accountId=", "GET", `/filters${q({ accountId })}`, {
      note: (f) => `${f?.filters?.length ?? 0} filters`,
    });
  } else {
    rows.push({ step: "(0.4.0 reads)", status: "—", ms: 0, detail: `skipped: ${serverVersion}` });
  }
}

try {
  await run();
} finally {
  if (token) {
    await step("/session", "DELETE", "/session", { expect: [200, 204] });
    token = undefined;
  }
}

const widths = { step: 34, status: 6, ms: 6 };
console.log(`silo-mobile ${version} smoke test against ${serverUrl}`);
console.log(
  `${"step".padEnd(widths.step)} ${"status".padEnd(widths.status)} ${"ms".padStart(widths.ms)}  detail`,
);
for (const r of rows) {
  console.log(
    `${r.step.padEnd(widths.step)} ${r.status.padEnd(widths.status)} ${String(r.ms).padStart(widths.ms)}  ${r.detail}`,
  );
}
console.log(failed ? "FAILED" : "OK");
process.exit(failed ? 1 : 0);
