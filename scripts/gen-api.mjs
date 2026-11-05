// Generates src/api/schema.d.ts from the silo-server OpenAPI contract.
//
//   npm run gen:api                          # uses "silo.serverRef" from package.json
//   npm run gen:api -- --server-ref v0.3.0   # fetch api/openapi.yaml from that git ref
//   npm run gen:api -- --local [path]        # read a local file (default ../silo-server/api/openapi.yaml)
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const outFile = resolve(root, "src/api/schema.d.ts");
const defaultLocal = "../silo-server/api/openapi.yaml";
const rawBase = "https://raw.githubusercontent.com/silopost/silo-server";

function fail(message) {
  console.error(`gen-api: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--server-ref") {
      args.serverRef = argv[++i];
      if (!args.serverRef) fail("--server-ref requires a git ref");
    } else if (arg === "--local") {
      const next = argv[i + 1];
      args.local = next && !next.startsWith("--") ? argv[++i] : defaultLocal;
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  if (args.serverRef && args.local) fail("use either --server-ref or --local, not both");
  return args;
}

async function readSource(args) {
  if (args.local) {
    const path = resolve(process.cwd(), args.local);
    try {
      return { text: await readFile(path, "utf8"), origin: `local file ${args.local}` };
    } catch (err) {
      fail(`cannot read ${path}: ${err.message}`);
    }
  }

  let ref = args.serverRef;
  if (!ref) {
    const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
    ref = pkg.silo?.serverRef;
    if (!ref) fail('no server ref: pass --server-ref or set "silo.serverRef" in package.json');
  }
  const url = `${rawBase}/${encodeURIComponent(ref)}/api/openapi.yaml`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    fail(`cannot reach ${url}: ${err.message}`);
  }
  if (!res.ok) {
    fail(
      `GET ${url} returned ${res.status}. The ref "${ref}" or the silopost/silo-server ` +
        "repository may not exist or may not be public yet; use --local for development.",
    );
  }
  return { text: await res.text(), origin: `silo-server@${ref}` };
}

const { text, origin } = await readSource(parseArgs(process.argv.slice(2)));
const ast = await openapiTS(text);
const header =
  `/**\n * GENERATED FILE, DO NOT EDIT.\n * Source: silo-server api/openapi.yaml\n` +
  ` * Regenerate with \`npm run gen:api\` (see README, "API contract").\n */\n\n`;
await writeFile(outFile, header + astToString(ast), "utf8");
console.log(`gen-api: wrote src/api/schema.d.ts from ${origin}`);
