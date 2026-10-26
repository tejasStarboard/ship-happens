import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import type { WorkbookCellWrite, WorkbookWritePort } from "@ship-happens/fill"
import { DomainError } from "@/lib/domain/errors"

/**
 * Default: `uvx --with click agent-xlsx` — click is required by current
 * agent-xlsx wheels but not always declared; `--with click` keeps writes working.
 * Override with `AGENT_XLSX_BIN` (space-separated argv prefix).
 */
function agentXlsxArgv(): string[] {
  const override = process.env.AGENT_XLSX_BIN?.trim()
  if (override) return override.split(/\s+/).filter(Boolean)
  return ["uvx", "--with", "click", "agent-xlsx"]
}

function runCommand(
  argv: string[],
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0]!, argv.slice(1), {
      cwd: options?.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8")
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(
        new Error(
          `Command failed (${code}): ${argv.join(" ")}\n${stderr || stdout}`
        )
      )
    })
  })
}

async function writeOneCell(
  filePath: string,
  cell: WorkbookCellWrite
): Promise<void> {
  const argv = [
    ...agentXlsxArgv(),
    "write",
    filePath,
    cell.cellRef,
    "--value",
    cell.value,
    "--sheet",
    cell.sheetName,
  ]
  await runCommand(argv)
}

/**
 * Cell-compliant write-back via agent-xlsx (openpyxl under the hood).
 * Copies the source buffer, applies each response cell in-place, returns bytes.
 */
export function createAgentXlsxWorkbookWriter(): WorkbookWritePort {
  return {
    async writeCells(input) {
      const dir = await mkdtemp(join(tmpdir(), "sh-export-"))
      const safeBase =
        input.fileName.replace(/[^\w.\-]+/g, "_") || "workbook.xlsx"
      const workPath = join(
        dir,
        safeBase.endsWith(".xlsx") ? safeBase : `${safeBase}.xlsx`
      )

      try {
        await writeFile(workPath, input.source)
        for (const cell of input.cells) {
          try {
            await writeOneCell(workPath, cell)
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "agent-xlsx write failed"
            throw new DomainError(
              `Failed writing ${cell.sheetName}!${cell.cellRef}: ${message}`,
              "VALIDATION"
            )
          }
        }
        return await readFile(workPath)
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined)
      }
    },
  }
}

export function createHttpSourceBytesFetcher(fetchImpl: typeof fetch = fetch): {
  fetch: (url: string) => Promise<Buffer>
} {
  return {
    async fetch(url: string) {
      const res = await fetchImpl(url)
      if (!res.ok) {
        throw new DomainError(
          `Failed to download source workbook (${res.status})`,
          "VALIDATION"
        )
      }
      return Buffer.from(await res.arrayBuffer())
    },
  }
}
