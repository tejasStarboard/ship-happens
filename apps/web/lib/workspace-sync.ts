import path from "node:path";
import {
  collectSyncFiles,
  ensureWorkspace,
  MAX_SYNC_FILE_BYTES,
  SKIP_DIR_NAMES,
  writeWorkspaceFile,
} from "@/lib/workspace-fs";

type SandboxHandle = {
  readBinaryFile(options: { path: string }): PromiseLike<Uint8Array | null>;
  writeBinaryFile(options: {
    path: string;
    content: Uint8Array;
  }): PromiseLike<unknown>;
  run(options: { command: string }): PromiseLike<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
};

const FIND_SKIP = [...SKIP_DIR_NAMES]
  .map((name) => `-name ${JSON.stringify(name)} -prune`)
  .join(" -o ");

/**
 * Push host workspace files into the session sandbox `/workspace`.
 * Host is the UI source of truth between turns; sandbox is what the agent sees.
 */
export async function pushWorkspaceToSandbox(
  sessionId: string,
  sandbox: SandboxHandle,
): Promise<number> {
  await ensureWorkspace(sessionId);
  const files = await collectSyncFiles(sessionId);
  for (const file of files) {
    await sandbox.writeBinaryFile({
      path: file.path,
      content: file.bytes,
    });
  }
  return files.length;
}

/**
 * Pull sandbox `/workspace` files (except skipped dirs) back to the host mirror.
 */
export async function pullSandboxToWorkspace(
  sessionId: string,
  sandbox: SandboxHandle,
): Promise<number> {
  await ensureWorkspace(sessionId);
  const listed = await sandbox.run({
    command: `cd /workspace && find . ${FIND_SKIP} -o -type f -print 2>/dev/null | head -n 2000`,
  });
  if (listed.exitCode !== 0) {
    throw new Error(listed.stderr || "Failed to list sandbox files");
  }

  const paths = listed.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\.\//, ""))
    .filter((relative) => relative.length > 0 && !relative.split("/").some((part) => SKIP_DIR_NAMES.has(part)));

  let written = 0;
  for (const relative of paths) {
    if (path.basename(relative).startsWith(".") && relative.startsWith(".eve/") === false) {
      // allow .eve/attachments; skip other dotfiles at root that are noisy
    }
    const bytes = await sandbox.readBinaryFile({ path: relative });
    if (!bytes || bytes.byteLength === 0) continue;
    if (bytes.byteLength > MAX_SYNC_FILE_BYTES) continue;
    await writeWorkspaceFile(sessionId, relative, Buffer.from(bytes));
    written += 1;
  }
  return written;
}
