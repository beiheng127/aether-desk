#!/usr/bin/env node
/**
 * 一键安全启动：校验 Node 版本/架构、.env.local、清理冲突端口，再启动 Next。
 */
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BREW_NODE = "/opt/homebrew/opt/node@20/bin/node";
const BREW_NPM = "/opt/homebrew/opt/node@20/bin/npm";
const PORT = process.env.PORT || "3000";

function log(msg) {
  console.log(`[desk] ${msg}`);
}

function fail(msg) {
  console.error(`[desk] ✗ ${msg}`);
  process.exit(1);
}

function whichNode() {
  if (fs.existsSync(BREW_NODE) && os.arch() === "arm64") {
    return { node: BREW_NODE, npm: BREW_NPM, label: "homebrew node@20" };
  }
  return {
    node: process.execPath,
    npm: "npm",
    label: "current PATH node",
  };
}

function run(cmd) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
  });
}

function killPort(port) {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
    }).trim();
    if (!out) return;
    for (const pid of out.split("\n")) {
      try {
        process.kill(Number(pid), "SIGTERM");
        log(`已结束占用 ${port} 的进程 PID ${pid}`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* nothing listening */
  }
}

function main() {
  process.chdir(ROOT);
  const { node, npm, label } = whichNode();

  const ver = execSync(`"${node}" -p "process.version"`, {
    encoding: "utf8",
  }).trim();
  const arch = execSync(`"${node}" -p "process.arch"`, {
    encoding: "utf8",
  }).trim();

  log(`使用 ${label}: ${ver} (${arch})`);

  const major = Number(ver.replace(/^v/, "").split(".")[0]);
  if (major < 20) {
    fail(`需要 Node ≥ 20，当前 ${ver}。请: brew install node@20`);
  }

  if (process.platform === "darwin" && arch === "x64") {
    log(
      '警告: 当前 Node 是 x64（可能走了 Rosetta）。M 系列请改用 arm64：export PATH="/opt/homebrew/opt/node@20/bin:$PATH"',
    );
  }

  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) {
    log(
      "未找到 .env.local → 将以离线 Fixture 模式启动（对话不调真模型）。可稍后: cp .env.example .env.local",
    );
  } else {
    const envText = fs.readFileSync(envPath, "utf8");
    const hasKey =
      /^(DEEPSEEK_API_KEY|OPENAI_API_KEY|AI_GATEWAY_API_KEY)=.+/m.test(envText) &&
      !/^(DEEPSEEK_API_KEY|OPENAI_API_KEY)=sk-your-key\s*$/m.test(envText) &&
      !/^(DEEPSEEK_API_KEY|OPENAI_API_KEY)=(your-api-key|changeme|xxx)\s*$/im.test(
        envText,
      );
    if (!hasKey) {
      log(
        ".env.local 无可用 Chat Key → 离线 Fixture 模式（有 Key 后自动切真模型）",
      );
    } else {
      log(".env.local API Key 已检测到 → 真模型模式");
    }
  }

  const sqliteNode = path.join(
    ROOT,
    "node_modules/better-sqlite3/build/Release/better_sqlite3.node",
  );
  if (fs.existsSync(sqliteNode)) {
    try {
      const fileOut = execSync(`file "${sqliteNode}"`, { encoding: "utf8" });
      const wantArm = arch === "arm64";
      const isArm = /\barm64\b/.test(fileOut);
      const isX64Only = /\bx86_64\b/.test(fileOut) && !isArm;
      const isArmOnly = isArm && !/\bx86_64\b/.test(fileOut);
      const mismatch =
        (wantArm && isX64Only) || (!wantArm && isArmOnly && !/\bx86_64\b/.test(fileOut));
      // 仅在「明确单架构且与 Node 不一致」时 rebuild；universal 跳过
      if (mismatch) {
        log("better-sqlite3 架构不匹配，正在 rebuild…");
        run(
          `"${npm}" rebuild better-sqlite3 --registry https://registry.npmjs.org`,
        );
      }
    } catch {
      log("跳过 better-sqlite3 检测（可手动 npm rebuild better-sqlite3）");
    }
  }

  killPort(3000);
  killPort(3001);

  log(`启动 Next.js → http://localhost:${PORT}`);
  log("请只用这个地址；旧的 3001 实例会导致「缺 Key / HTTP 500」。");

  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(node, [nextBin, "dev", "-p", PORT], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `${path.dirname(node)}${path.delimiter}${process.env.PATH || ""}`,
      PORT,
    },
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
