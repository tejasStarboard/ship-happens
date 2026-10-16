import { readFileSync } from "node:fs"

/** Read JSON body from --body, --file, or stdin when `-` / empty and piped. */
export async function readJsonInput(opts: {
  body?: string
  file?: string
  allowEmpty?: boolean
}): Promise<Record<string, unknown>> {
  if (opts.file) {
    const text = readFileSync(opts.file, "utf8")
    return JSON.parse(text) as Record<string, unknown>
  }
  if (opts.body === "-" || (opts.body === undefined && !process.stdin.isTTY)) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const text = Buffer.concat(chunks).toString("utf8").trim()
    if (!text) {
      if (opts.allowEmpty) return {}
      throw new Error("Expected JSON on stdin")
    }
    return JSON.parse(text) as Record<string, unknown>
  }
  if (opts.body) {
    return JSON.parse(opts.body) as Record<string, unknown>
  }
  if (opts.allowEmpty) return {}
  throw new Error(
    "Provide --body '{...}', --file path.json, or pipe JSON on stdin"
  )
}
