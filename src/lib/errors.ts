/**
 * 运行时错误文案：把原生模块 / 环境问题翻译成可执行修复步骤。
 */
export function formatRuntimeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const arch = process.arch;
  const node = process.version;

  if (
    /incompatible architecture|ERR_DLOPEN_FAILED|mach-o file/i.test(raw)
  ) {
    return [
      `SQLite 原生模块与当前 Node 架构不匹配（Node ${node} / ${arch}）。`,
      `请关闭所有旧的 next 进程后执行：`,
      `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"`,
      `cd aether-desk && npm rebuild better-sqlite3 && npm run desk`,
      `然后只打开 http://localhost:3000 （不要用 3001 旧进程）。`,
    ].join(" ");
  }

  if (/缺少 API Key|未配置 API Key/i.test(raw)) {
    return raw;
  }

  return raw || "未知服务端错误";
}

export function isNativeModuleError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /incompatible architecture|ERR_DLOPEN_FAILED|mach-o file/i.test(raw);
}
