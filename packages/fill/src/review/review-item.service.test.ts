import { describe, expect, it, vi } from "vitest"
import { DomainError } from "../errors"
import type { FillPipelineManager } from "../pipeline/fill-pipeline.manager"
import { PROGRESS_WAIT_DETAIL } from "../pipeline/fill-pipeline.manager"
import type { RfpRepository } from "../rfp/rfp.repository"
import type { ReviewItemRepository } from "./review-item.repository"
import { normalizeDecideInput, ReviewItemService } from "./review-item.service"
import {
  RESOLVABLE_REVIEW_STATUSES,
  REVIEW_ITEM_STATUSES,
  type ReviewItemStatus,
} from "./review-item.types"

describe("review item status machine", () => {
  it("exposes Phase 2b statuses", () => {
    expect(REVIEW_ITEM_STATUSES).toEqual([
      "pending",
      "approved",
      "edited",
      "rejected",
      "resolved",
    ])
  })

  it("only allows resolve after a human decision", () => {
    expect(RESOLVABLE_REVIEW_STATUSES).toEqual([
      "approved",
      "edited",
      "rejected",
    ])
    expect(RESOLVABLE_REVIEW_STATUSES).not.toContain("pending")
  })

  it("DomainError codes stay stable for CLI mapping", () => {
    const err = new DomainError(
      'Cannot resolve review item in status "pending"',
      "VALIDATION"
    )
    expect(err.code).toBe("VALIDATION")
  })
})

describe("normalizeDecideInput", () => {
  it("maps approved", () => {
    expect(normalizeDecideInput({ decision: "approved" })).toEqual({
      status: "approved",
      decisionNote: null,
    })
  })

  it("maps edited with resolution", () => {
    expect(
      normalizeDecideInput({
        decision: "edited",
        resolution: { value: "B" },
      })
    ).toEqual({
      status: "edited",
      decisionNote: null,
      resolution: { value: "B" },
    })
  })

  it("rejects edited without resolution keys", () => {
    expect(() =>
      normalizeDecideInput({ decision: "edited", resolution: {} })
    ).toThrow(DomainError)
  })

  it("maps rejected with trimmed note", () => {
    expect(
      normalizeDecideInput({
        decision: "rejected",
        decisionNote: "  wrong column  ",
      })
    ).toEqual({
      status: "rejected",
      decisionNote: "wrong column",
    })
  })

  it("rejects empty decisionNote", () => {
    expect(() =>
      normalizeDecideInput({ decision: "rejected", decisionNote: "   " })
    ).toThrow(DomainError)
  })
})

function pendingRow(overrides?: {
  status?: ReviewItemStatus
  resolution?: Record<string, unknown>
  stepKey?: string | null
  source?: string | null
  title?: string
}) {
  const now = new Date("2026-01-15T12:00:00.000Z")
  return {
    id: "rev_test1",
    rfpId: "fill_1",
    organizationId: "org_1",
    stepKey: overrides?.stepKey === undefined ? "map" : overrides.stepKey,
    title: overrides?.title ?? "Map column X",
    status: overrides?.status ?? ("pending" as ReviewItemStatus),
    proposal: { col: "A" },
    confidence: "0.4",
    source: overrides?.source === undefined ? "mapper" : overrides.source,
    sourceMetadata: {},
    decidedByUserId: null,
    decidedAt: null,
    decisionNote: null,
    resolution: overrides?.resolution ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

function createService(opts?: {
  row?: ReturnType<typeof pendingRow> | null
  fillStatus?: string
  pendingCount?: number
  stepPendingCount?: number
}) {
  const row = opts?.row === undefined ? pendingRow() : opts.row
  const updateById = vi.fn(
    async (_id: string, patch: Record<string, unknown>) => {
      if (!row) return null
      return { ...row, ...patch, updatedAt: new Date() }
    }
  )
  const insert = vi.fn(async (input: Record<string, unknown>) => ({
    ...pendingRow({
      stepKey: (input.stepKey as string | null | undefined) ?? null,
    }),
    id: (input.id as string) ?? "rev_new",
    title: (input.title as string) ?? "Map column X",
    status: "pending" as ReviewItemStatus,
    proposal: (input.proposal as Record<string, unknown>) ?? {},
  }))
  const countPending = vi.fn(
    async (_rfpId: string, options?: { stepKey?: string | null }) => {
      if (options && "stepKey" in options) {
        return opts?.stepPendingCount ?? 0
      }
      return opts?.pendingCount ?? 0
    }
  )
  const repo = {
    findByIdForFill: vi.fn(async () => row),
    updateById,
    insert,
    countPending,
  } as unknown as ReviewItemRepository

  const rfps = {
    findByIdForOrganization: vi.fn(async () =>
      row
        ? {
            id: row.rfpId,
            organizationId: row.organizationId,
            name: "Test",
            status: opts?.fillStatus ?? "running",
          }
        : {
            id: "fill_1",
            organizationId: "org_1",
            name: "Test",
            status: opts?.fillStatus ?? "running",
          }
    ),
  } as unknown as RfpRepository

  const setRfpStatus = vi.fn(async () => undefined)
  const updateStep = vi.fn(async () => undefined)
  const appendLog = vi.fn(async () => undefined)
  const completeStep = vi.fn(async () => undefined)
  const listSteps = vi.fn(async () => [
    {
      id: "step_map",
      key: "map",
      status: "running",
      detail: PROGRESS_WAIT_DETAIL,
    },
  ])
  const pipeline = {
    setRfpStatus,
    updateStep,
    appendLog,
    completeStep,
    listSteps,
  } as unknown as FillPipelineManager

  return {
    service: new ReviewItemService(repo, rfps, pipeline),
    repo,
    updateById,
    insert,
    countPending,
    setRfpStatus,
    updateStep,
    appendLog,
    completeStep,
    listSteps,
  }
}

describe("ReviewItemService.create progress hold", () => {
  it("force-holds fill + known stepKey on create", async () => {
    const { service, setRfpStatus, updateStep, appendLog } = createService()
    await service.create("org_1", "fill_1", {
      title: "Map column X",
      stepKey: "map",
      proposal: { col: "A" },
    })

    expect(setRfpStatus).toHaveBeenCalledWith("fill_1", "needs_review")
    expect(updateStep).toHaveBeenCalledWith(
      "fill_1",
      "map",
      "running",
      PROGRESS_WAIT_DETAIL
    )
    expect(appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        stepKey: "map",
        message: "Open review wait on step: map",
      })
    )
  })

  it("fill-level hold only when stepKey is null", async () => {
    const { service, setRfpStatus, updateStep, appendLog } = createService()
    await service.create("org_1", "fill_1", {
      title: "General ask",
      stepKey: null,
    })

    expect(setRfpStatus).toHaveBeenCalledWith("fill_1", "needs_review")
    expect(updateStep).not.toHaveBeenCalled()
    expect(appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        stepKey: null,
        message: "Open review wait (no progress step)",
      })
    )
  })

  it("does not override terminal fill status", async () => {
    const { service, setRfpStatus, updateStep } = createService({
      fillStatus: "done",
    })
    await service.create("org_1", "fill_1", {
      title: "Late review",
      stepKey: "map",
    })

    expect(setRfpStatus).not.toHaveBeenCalled()
    expect(updateStep).toHaveBeenCalled()
  })
})

describe("ReviewItemService.decide", () => {
  it("auto-resolves Confirm to resolved with decision fields", async () => {
    const { service, updateById } = createService({ pendingCount: 0 })
    const view = await service.decide(
      "org_1",
      "fill_1",
      "rev_test1",
      { decision: "approved" },
      "user_1"
    )

    expect(view.status).toBe("resolved")
    expect(view.decidedByUserId).toBe("user_1")
    expect(view.decidedAt).toBeInstanceOf(Date)
    expect(view.decisionNote).toBeNull()
    expect(updateById).toHaveBeenCalledWith(
      "rev_test1",
      expect.objectContaining({
        status: "resolved",
        decidedByUserId: "user_1",
        decisionNote: null,
        resolution: { decision: "approved" },
      })
    )
  })

  it("export-signoff Confirm completes export + review steps", async () => {
    const { service, completeStep } = createService({
      pendingCount: 0,
      stepPendingCount: 0,
      row: pendingRow({
        source: "export-signoff",
        stepKey: "export",
        title: "Final export sign-off",
      }),
    })
    await service.decide(
      "org_1",
      "fill_1",
      "rev_test1",
      { decision: "approved" },
      "user_1"
    )
    expect(completeStep).toHaveBeenCalledWith(
      "fill_1",
      "export",
      expect.stringContaining("signed off")
    )
    expect(completeStep).toHaveBeenCalledWith(
      "fill_1",
      "review",
      expect.stringContaining("signed off")
    )
  })

  it("export-signoff Reject fails export + review with reason", async () => {
    const { service, updateStep, setRfpStatus } = createService({
      pendingCount: 0,
      stepPendingCount: 0,
      row: pendingRow({
        source: "export-signoff",
        stepKey: "export",
        title: "Final export sign-off",
      }),
    })
    await service.decide(
      "org_1",
      "fill_1",
      "rev_test1",
      { decision: "rejected", decisionNote: "rates look wrong" },
      "user_1"
    )
    expect(updateStep).toHaveBeenCalledWith(
      "fill_1",
      "export",
      "failed",
      "Sign-off rejected: rates look wrong"
    )
    expect(updateStep).toHaveBeenCalledWith(
      "fill_1",
      "review",
      "failed",
      "Sign-off rejected: rates look wrong"
    )
    expect(setRfpStatus).toHaveBeenCalledWith("fill_1", "needs_review")
  })

  it("releases Progress when last pending Confirm clears", async () => {
    const { service, setRfpStatus, updateStep, appendLog } = createService({
      fillStatus: "needs_review",
      pendingCount: 0,
      stepPendingCount: 0,
    })
    await service.decide(
      "org_1",
      "fill_1",
      "rev_test1",
      { decision: "approved" },
      "user_1"
    )

    expect(setRfpStatus).toHaveBeenCalledWith("fill_1", "running")
    expect(updateStep).toHaveBeenCalledWith(
      "fill_1",
      "map",
      "running",
      "Review cleared — continue step"
    )
    expect(appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Review waits cleared for step: map",
      })
    )
  })

  it("keeps needs_review when other pending waits remain", async () => {
    const { service, setRfpStatus, updateStep } = createService({
      fillStatus: "needs_review",
      pendingCount: 1,
      stepPendingCount: 1,
    })
    await service.decide(
      "org_1",
      "fill_1",
      "rev_test1",
      { decision: "approved" },
      "user_1"
    )

    expect(setRfpStatus).not.toHaveBeenCalled()
    expect(updateStep).not.toHaveBeenCalled()
  })

  it("leaves Edit at edited (agent must resolve) and still releases wait", async () => {
    const { service, updateById, setRfpStatus } = createService({
      fillStatus: "needs_review",
      pendingCount: 0,
      stepPendingCount: 0,
    })
    const view = await service.decide(
      "org_1",
      "fill_1",
      "rev_test1",
      { decision: "edited", resolution: { col: "B" } },
      "user_1"
    )

    expect(view.status).toBe("edited")
    expect(view.resolution).toEqual({ col: "B" })
    expect(updateById).toHaveBeenCalledWith(
      "rev_test1",
      expect.objectContaining({
        status: "edited",
        resolution: { col: "B" },
      })
    )
    expect(setRfpStatus).toHaveBeenCalledWith("fill_1", "running")
  })

  it("leaves Reject at rejected (agent must resolve)", async () => {
    const { service, updateById } = createService({
      pendingCount: 0,
      stepPendingCount: 0,
    })
    const view = await service.decide(
      "org_1",
      "fill_1",
      "rev_test1",
      { decision: "rejected", decisionNote: "wrong mapping" },
      "user_1"
    )

    expect(view.status).toBe("rejected")
    expect(view.decisionNote).toBe("wrong mapping")
    expect(updateById).toHaveBeenCalledWith(
      "rev_test1",
      expect.objectContaining({
        status: "rejected",
        decisionNote: "wrong mapping",
      })
    )
  })
})

describe("ReviewItemService.resolve", () => {
  it("rejects resolve from pending", async () => {
    const { service } = createService({ row: pendingRow() })
    await expect(
      service.resolve("org_1", "fill_1", "rev_test1")
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: expect.stringContaining("pending"),
    })
  })

  it("resolves from edited", async () => {
    const { service, updateById } = createService({
      row: pendingRow({
        status: "edited",
        resolution: { col: "B" },
      }),
    })
    const view = await service.resolve("org_1", "fill_1", "rev_test1", {
      resolution: { applied: true },
    })

    expect(view.status).toBe("resolved")
    expect(view.resolution).toEqual({ applied: true })
    expect(updateById).toHaveBeenCalledWith(
      "rev_test1",
      expect.objectContaining({
        status: "resolved",
        resolution: { applied: true },
      })
    )
  })

  it("rejects resolve when already resolved", async () => {
    const { service } = createService({
      row: pendingRow({ status: "resolved" }),
    })
    await expect(
      service.resolve("org_1", "fill_1", "rev_test1")
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: expect.stringContaining("already resolved"),
    })
  })
})
