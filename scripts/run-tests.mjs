#!/usr/bin/env node
/**
 * 零额外依赖单测：用已安装的 typescript 编译后跑 node:test。
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const files = [
  "src/lib/notes/rrf.ts",
  "src/lib/notes/rrf.test.ts",
  "src/lib/notes/rag-config.ts",
  "src/lib/notes/rag-config.test.ts",
  "src/lib/hitl/transitions.ts",
  "src/lib/hitl/transitions.test.ts",
  "src/lib/hitl/citation.test.ts",
];

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "aether-tests-"));

for (const rel of files) {
  const abs = path.join(root, rel);
  const src = fs.readFileSync(abs, "utf8");
  const rewritten = src.replace(
    /from ["'](\.[^"']+)["']/g,
    (_m, p1) => `from "${p1.replace(/\.ts$/, "")}"`,
  );
  const { outputText } = ts.transpileModule(rewritten, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: abs,
  });
  const dest = path.join(outDir, rel.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, outputText);
}

const testFiles = files
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => path.join(outDir, f.replace(/\.ts$/, ".js")));

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
  cwd: outDir,
});

fs.rmSync(outDir, { recursive: true, force: true });
process.exit(result.status ?? 1);
