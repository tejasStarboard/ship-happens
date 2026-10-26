import { db } from "@/lib/db"
import {
  FillPipelineManager,
  FillReportRepository,
  IntakeService,
  MarginFloorRuleRepository,
  MarginFloorRuleService,
  OverlayApplicationService,
  OverlayRuleRepository,
  OverlayRuleService,
  RateResolutionService,
  ReviewItemRepository,
  ReviewItemService,
  RfpRepository,
  type AppDb,
  type BlobStore,
  type MappingStore,
  type StarboardRatesPort,
  type WorkspaceHost,
} from "@ship-happens/fill"
import { createStarboardRatesPort } from "@/lib/domain/rates/starboard-rates-adapter"
import { createWorkspaceMappingStore } from "@/lib/domain/rates/workspace-mapping-store"
import { RfpService } from "@/lib/domain/rfp/rfp.service"
import { TemplateRepository } from "@/lib/domain/templates/template.repository"
import { TemplateService } from "@/lib/domain/templates/template.service"
import { WorkspaceManager } from "@/lib/domain/workspace/workspace.manager"
import {
  createStarboardClient,
  type StarboardClient,
} from "@/lib/starboard/client"
import { getBlobStorage, type VercelBlobStorage } from "@/lib/storage/vbs"
import { writeWorkspaceFile } from "@/lib/workspace-fs"
import { ensureRfpWorkspace } from "@/lib/workspace-registry"

export type AppDeps = {
  db: AppDb
  blob: VercelBlobStorage
  createStarboardClient: () => Promise<StarboardClient>
  workspace?: WorkspaceHost
  mappingStore?: MappingStore
  starboardRates?: StarboardRatesPort
}

function asBlobStore(blob: VercelBlobStorage): BlobStore {
  return {
    upload: (input) => blob.upload(input),
    delete: (url) => blob.delete(url),
  }
}

function defaultWorkspaceHost(): WorkspaceHost {
  return {
    ensureRfpWorkspace,
    writeWorkspaceFile,
  }
}

/**
 * Request-scoped (or test) dependency graph.
 * Fill/intake come from `@ship-happens/fill`; DB schema from `@workspace/db`.
 */
export function createAppContext(deps?: Partial<AppDeps>) {
  const database = deps?.db ?? db
  const blob = deps?.blob ?? getBlobStorage()
  const starboardFactory = deps?.createStarboardClient ?? createStarboardClient
  const workspace = deps?.workspace ?? defaultWorkspaceHost()

  const rfpRepo = new RfpRepository(database)
  const templateRepo = new TemplateRepository(database)
  const pipeline = new FillPipelineManager(database)
  const reviewRepo = new ReviewItemRepository(database)
  const reviews = new ReviewItemService(reviewRepo, rfpRepo, pipeline)
  const fillReports = new FillReportRepository(database)
  const overlayRulesRepo = new OverlayRuleRepository(database)
  const overlayRules = new OverlayRuleService(overlayRulesRepo)
  const marginFloorsRepo = new MarginFloorRuleRepository(database)
  const marginFloors = new MarginFloorRuleService(marginFloorsRepo)
  const mappingStore = deps?.mappingStore ?? createWorkspaceMappingStore()
  const starboardRates =
    deps?.starboardRates ?? createStarboardRatesPort(starboardFactory)
  const rates = new RateResolutionService(
    rfpRepo,
    pipeline,
    fillReports,
    mappingStore,
    starboardRates
  )
  const overlays = new OverlayApplicationService(
    rfpRepo,
    pipeline,
    fillReports,
    overlayRulesRepo,
    marginFloorsRepo,
    reviews
  )

  return {
    db: database,
    blob,
    createStarboardClient: starboardFactory,
    rfps: new RfpService(rfpRepo, pipeline, reviews, fillReports),
    templates: new TemplateService(templateRepo),
    intake: new IntakeService(
      database,
      rfpRepo,
      pipeline,
      asBlobStore(blob),
      workspace
    ),
    pipeline,
    reviews,
    rates,
    overlayRules,
    marginFloors,
    overlays,
    workspaces: new WorkspaceManager(blob),
    repos: {
      rfps: rfpRepo,
      templates: templateRepo,
      reviews: reviewRepo,
      fillReports,
      overlayRules: overlayRulesRepo,
      marginFloors: marginFloorsRepo,
    },
  }
}

export type AppContext = ReturnType<typeof createAppContext>
