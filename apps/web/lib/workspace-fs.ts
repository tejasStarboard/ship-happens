import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { isTextPath, type WorkspaceEntry } from "@/lib/workspace-types";

export type { WorkspaceEntry } from "@/lib/workspace-types";
export { isTextPath } from "@/lib/workspace-types";

const WORKSPACES_ROOT = path.join(process.cwd(), "data", "workspaces");

const SKIP_DIR_NAMES = new Set([
  ".git",
  ".venv",
  "node_modules",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
]);

const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_SYNC_FILE_BYTES = 5 * 1024 * 1024;

export function isValidSessionId(sessionId: string): boolean {
  return /^[\w.-]{1,128}$/.test(sessionId);
}

export function workspaceRoot(sessionId: string): string {
  if (!isValidSessionId(sessionId)) {
    throw new Error("Invalid session id");
  }
  return path.join(WORKSPACES_ROOT, sessionId);
}

/** Resolve a workspace-relative path; throws if it escapes the root. */
export function resolveWorkspacePath(sessionId: string, relativePath: string): string {
  const root = workspaceRoot(sessionId);
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (normalized.length === 0 || normalized.includes("\0")) {
    throw new Error("Invalid path");
  }
  const absolute = path.resolve(root, normalized);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes workspace");
  }
  return absolute;
}

export function toWorkspaceRelative(sessionId: string, absolutePath: string): string {
  const root = workspaceRoot(sessionId);
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

export async function ensureWorkspace(sessionId: string): Promise<string> {
  const root = workspaceRoot(sessionId);
  await mkdir(root, { recursive: true });
  return root;
}

export async function listWorkspaceTree(sessionId: string): Promise<WorkspaceEntry[]> {
  const root = await ensureWorkspace(sessionId);
  return walkDir(root, root);
}

async function walkDir(root: string, dir: string): Promise<WorkspaceEntry[]> {
  const names = await readdir(dir);
  names.sort((a, b) => a.localeCompare(b));
  const entries: WorkspaceEntry[] = [];

  for (const name of names) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    const absolute = path.join(dir, name);
    const info = await stat(absolute);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (info.isDirectory()) {
      entries.push({
        type: "dir",
        name,
        path: relative,
        children: await walkDir(root, absolute),
      });
    } else if (info.isFile()) {
      entries.push({
        type: "file",
        name,
        path: relative,
        size: info.size,
      });
    }
  }

  return entries;
}

export async function listWorkspaceFiles(sessionId: string): Promise<string[]> {
  const files: string[] = [];
  const walk = (entries: WorkspaceEntry[]) => {
    for (const entry of entries) {
      if (entry.type === "file") files.push(entry.path);
      else walk(entry.children);
    }
  };
  walk(await listWorkspaceTree(sessionId));
  return files;
}

export async function readWorkspaceFile(
  sessionId: string,
  relativePath: string,
): Promise<{ content: string; encoding: "utf-8"; size: number } | { content: Buffer; encoding: "binary"; size: number }> {
  const absolute = resolveWorkspacePath(sessionId, relativePath);
  const info = await stat(absolute);
  if (!info.isFile()) {
    throw new Error("Not a file");
  }
  const buffer = await readFile(absolute);
  if (isTextPath(relativePath) && buffer.byteLength <= MAX_TEXT_BYTES && !looksBinary(buffer)) {
    return { content: buffer.toString("utf8"), encoding: "utf-8", size: buffer.byteLength };
  }
  return { content: buffer, encoding: "binary", size: buffer.byteLength };
}

export async function writeWorkspaceFile(
  sessionId: string,
  relativePath: string,
  content: string | Buffer,
): Promise<void> {
  const absolute = resolveWorkspacePath(sessionId, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

export async function deleteWorkspacePath(sessionId: string, relativePath: string): Promise<void> {
  const absolute = resolveWorkspacePath(sessionId, relativePath);
  await rm(absolute, { recursive: true, force: true });
}

export async function renameWorkspacePath(
  sessionId: string,
  fromPath: string,
  toPath: string,
): Promise<void> {
  const from = resolveWorkspacePath(sessionId, fromPath);
  const to = resolveWorkspacePath(sessionId, toPath);
  if (from === to) return;

  let destinationExists = false;
  try {
    await stat(to);
    destinationExists = true;
  } catch {
    destinationExists = false;
  }
  if (destinationExists) {
    throw new Error("A file already exists at the destination");
  }

  await mkdir(path.dirname(to), { recursive: true });
  await rename(from, to);
}

export async function collectSyncFiles(
  sessionId: string,
): Promise<Array<{ path: string; bytes: Buffer }>> {
  const root = await ensureWorkspace(sessionId);
  const out: Array<{ path: string; bytes: Buffer }> = [];
  await collectFiles(root, root, out);
  return out;
}

/**
 * Copy files from one workspace folder into another (e.g. orphaned session
 * mirror → durable workspace id). Does not overwrite existing destination files.
 */
export async function mergeWorkspaceFiles(fromId: string, toId: string): Promise<number> {
  if (fromId === toId) return 0;
  if (!isValidSessionId(fromId) || !isValidSessionId(toId)) return 0;

  const fromRoot = path.join(WORKSPACES_ROOT, fromId);
  try {
    await stat(fromRoot);
  } catch {
    return 0;
  }

  await ensureWorkspace(toId);
  const files = await collectSyncFiles(fromId);
  let copied = 0;
  for (const file of files) {
    const dest = resolveWorkspacePath(toId, file.path);
    try {
      await stat(dest);
      continue; // keep existing workspace file
    } catch {
      // missing — copy
    }
    await writeWorkspaceFile(toId, file.path, file.bytes);
    copied += 1;
  }
  return copied;
}

async function collectFiles(
  root: string,
  dir: string,
  out: Array<{ path: string; bytes: Buffer }>,
): Promise<void> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    const absolute = path.join(dir, name);
    const info = await stat(absolute);
    if (info.isDirectory()) {
      await collectFiles(root, absolute, out);
      continue;
    }
    if (!info.isFile() || info.size > MAX_SYNC_FILE_BYTES) continue;
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    out.push({ path: relative, bytes: await readFile(absolute) });
  }
}

export function sha256Prefix(bytes: Buffer, length = 16): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, length);
}

function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.byteLength, 8000));
  for (const byte of sample) {
    if (byte === 0) return true;
  }
  return false;
}

export { MAX_SYNC_FILE_BYTES, SKIP_DIR_NAMES, WORKSPACES_ROOT };
