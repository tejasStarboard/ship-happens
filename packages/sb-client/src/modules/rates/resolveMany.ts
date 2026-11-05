/**
 * Bounded parallel contract resolve + optional disk/memory cache.
 * Shared auth session — avoids CLI cold-start × N lanes.
 */

import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { StarboardHttp } from "../../http/starboardHttp.js"
import { StarboardApiError } from "../../http/starboardHttp.js"
import {
  resolveContractRates,
  type ResolvedRate,
} from "./resolveFullRate.js"
import type { ContractSearchInput } from "./schemas.js"
import { ContractSearchInputSchema } from "./schemas.js"

export type ResolveManyJob = {
  id: string
  /** Full contract search body, or shorthand origins/dests/containers. */
  input?: ContractSearchInput
  origins?: string[]
  dests?: string[]
  containers?: string[]
  limit?: number
  service_type?: ContractSearchInput["service_type"]
}

export type ResolveManyResult = {
  id: string
  ok: true
  rates: ResolvedRate[]
  count: number
  cached?: boolean
} | {
  id: string
  ok: false
  error: string
  status?: number
}

export type ResolveManyOptions = {
  concurrency?: number
  /** In-memory + optional disk cache. Default true. */
  cache?: boolean
  /** Disk cache dir; when set, persists across process restarts. */
  cacheDir?: string
  /** Max retries on HTTP 429. Default 3. */
  maxRetries?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function jobToInput(job: ResolveManyJob): ContractSearchInput {
  if (job.input) return ContractSearchInputSchema.parse(job.input)
  const containers = job.containers?.length ? job.containers : ["40HC"]
  return ContractSearchInputSchema.parse({
    service_type: job.service_type ?? "ocean_fcl",
    origin_locodes: job.origins ?? [],
    destination_locodes: job.dests ?? [],
    cargo: {
      cargo_type: "container",
      container_types: containers,
    },
    limit: job.limit ?? 20,
    sort_by: "price",
    sort_dir: "asc",
    sort_equipment_type: containers[0],
  })
}

function cacheKey(input: ContractSearchInput): string {
  const cargo = input.cargo
  const payload = {
    st: input.service_type,
    o: [...(input.origin_locodes ?? []), ...(input.origin_locode ? [input.origin_locode] : [])].sort(),
    d: [
      ...(input.destination_locodes ?? []),
      ...(input.destination_locode ? [input.destination_locode] : []),
    ].sort(),
    ov: input.origin_via_locodes ?? input.origin_via_locode ?? null,
    dv: input.destination_via_locodes ?? input.destination_via_locode ?? null,
    ct: cargo?.container_types ?? (cargo?.container_type ? [cargo.container_type] : []),
    limit: input.limit ?? null,
    page: input.page ?? null,
    page_size: input.page_size ?? null,
  }
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32)
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (err) {
      const status =
        err instanceof StarboardApiError ? err.statusCode : undefined
      if (status !== 429 || attempt >= maxRetries) throw err
      const backoff = Math.min(30_000, 500 * 2 ** attempt)
      await sleep(backoff)
      attempt += 1
    }
  }
}

class ResolveCache {
  private memory = new Map<string, ResolvedRate[]>()
  constructor(private readonly dir: string | null) {}

  async get(key: string): Promise<ResolvedRate[] | null> {
    const mem = this.memory.get(key)
    if (mem) return mem
    if (!this.dir) return null
    try {
      const raw = await readFile(path.join(this.dir, `${key}.json`), "utf8")
      const parsed = JSON.parse(raw) as { rates?: ResolvedRate[] }
      if (!Array.isArray(parsed.rates)) return null
      this.memory.set(key, parsed.rates)
      return parsed.rates
    } catch {
      return null
    }
  }

  async set(key: string, rates: ResolvedRate[]): Promise<void> {
    this.memory.set(key, rates)
    if (!this.dir) return
    await mkdir(this.dir, { recursive: true })
    await writeFile(
      path.join(this.dir, `${key}.json`),
      JSON.stringify({ rates }),
      "utf8"
    )
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  async function worker() {
    for (;;) {
      const i = next
      next += 1
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return out
}

/**
 * Resolve many lanes with one HTTP session, bounded concurrency, optional cache.
 */
export async function resolveMany(
  http: StarboardHttp,
  jobs: ResolveManyJob[],
  opts?: ResolveManyOptions
): Promise<ResolveManyResult[]> {
  const concurrency = opts?.concurrency ?? 10
  const useCache = opts?.cache !== false
  const maxRetries = opts?.maxRetries ?? 3
  const cache = useCache
    ? new ResolveCache(opts?.cacheDir ?? null)
    : null

  return mapPool(jobs, concurrency, async (job) => {
    const id = job.id
    try {
      const input = jobToInput(job)
      const key = cacheKey(input)
      if (cache) {
        const hit = await cache.get(key)
        if (hit) {
          return { id, ok: true as const, rates: hit, count: hit.length, cached: true }
        }
      }
      const resolved = await withRetry(
        () => resolveContractRates(http, input),
        maxRetries
      )
      if (cache) await cache.set(key, resolved.rates)
      return {
        id,
        ok: true as const,
        rates: resolved.rates,
        count: resolved.count,
        cached: false,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status =
        err instanceof StarboardApiError ? err.statusCode : undefined
      return { id, ok: false as const, error: message, status }
    }
  })
}
