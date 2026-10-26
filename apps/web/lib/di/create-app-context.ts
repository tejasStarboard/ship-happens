import { db } from "@/lib/db"
import {
  createDbMappingStore,
  FillMappingRepository,
  FillMappingService,
  FillPipelineManager,
  FillReportRepository,
  IntakeService,
  MarginFloorRuleRepository,
  MarginFloorRuleService,
  OverlayApplicationService,
  OverlayRuleRepository,
  OverlayRuleService,
  PlaceMappingService,
  RateResolutionService,
  ReviewItemRepository,
  ReviewItemService,
  RfpRepository,
  WorkbookExportService,
  type AppDb,
  type BlobStore,
  type CrmMatchPort,
  type GeoResolvePort,
  type MappingStore,
  type SourceBytesFetcher,
  type StarboardRatesPort,
  type WorkbookWritePort,
  type WorkspaceHost,
} from "@ship-happens/fill"
import {
  createAgentXlsxWorkbookWriter,
  createHttpSourceBytesFetcher,
} from "@/lib/domain/export/agent-xlsx-workbook-writer"
import {
  createCrmMatchPort,
  createGeoResolvePort,
} from "@/lib/domain/rates/geo-resolve-adapter"
import { createStarboardRatesPort } from "@/lib/domain/rates/starboard-rates-adapter"
import { createWorkspaceMappingFileReader } from "@/lib/domain/rates/workspace-mapping-store"
import { RfpService } from "@/lib/domain/rfp/rfp.service"
import { TemplateRepository } from "@/lib/domain/templates/template.repository"
import { TemplateService } from "@/lib/domain/templates/template.service"
import { WorkspaceManager } from "@/lib/domain/workspace/workspace.manager"
import { EmailIntegrationRepository } from "@/lib/domain/email-intake/email-integration.repository"
import { EmailIntakeService } from "@/lib/domain/email-intake/email-intake.service"
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
  geoResolve?: GeoResolvePort
  crmMatch?: CrmMatchPort
  workbookWriter?: WorkbookWritePort
  sourceFetcher?: SourceBytesFetcher
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
  const fillReports = new FillReportRepository(database)
  const fillMappings = new FillMappingRepository(database)
  const mapping = new FillMappingService(rfpRepo, fillMappings, pipeline)
  const reviews = new ReviewItemService(reviewRepo, rfpRepo, pipeline, mapping)
  const overlayRulesRepo = new OverlayRuleRepository(database)
  const overlayRules = new OverlayRuleService(overlayRulesRepo)
  const marginFloorsRepo = new MarginFloorRuleRepository(database)
  const marginFloors = new MarginFloorRuleService(marginFloorsRepo)
  const mappingStore =
    deps?.mappingStore ??
    createDbMappingStore(fillMappings, createWorkspaceMappingFileReader())
  const starboardRates =
    deps?.starboardRates ?? createStarboardRatesPort(starboardFactory)
  const geoResolve = deps?.geoResolve ?? createGeoResolvePort(starboardFactory)
  const crmMatch = deps?.crmMatch ?? createCrmMatchPort()
  const placeMapping = new PlaceMappingService(
    rfpRepo,
    mapping,
    reviews,
    geoResolve,
    crmMatch,
    pipeline
  )
  const rates = new RateResolutionService(
    rfpRepo,
    pipeline,
    fillReports,
    mappingStore,
    starboardRates,
    reviewRepo
  )
  const overlays = new OverlayApplicationService(
    rfpRepo,
    pipeline,
    fillReports,
    overlayRulesRepo,
    marginFloorsRepo,
    reviews
  )
  const blobStore = asBlobStore(blob)
  const workbookWriter = deps?.workbookWriter ?? createAgentXlsxWorkbookWriter()
  const sourceFetcher = deps?.sourceFetcher ?? createHttpSourceBytesFetcher()
  const exportWorkbook = new WorkbookExportService(
    rfpRepo,
    pipeline,
    fillReports,
    reviews,
    blobStore,
    workbookWriter,
    sourceFetcher,
    workspace
  )
  const intake = new IntakeService(
    database,
    rfpRepo,
    pipeline,
    blobStore,
    workspace
  )
  const emailIntegrations = new EmailIntegrationRepository(database)
  const emailIntake = new EmailIntakeService(
    database,
    emailIntegrations,
    intake
  )

  return {
    db: database,
    blob,
    createStarboardClient: starboardFactory,
    rfps: new RfpService(rfpRepo, pipeline, reviews, fillReports, mappingStore),
    templates: new TemplateService(templateRepo),
    intake,
    emailIntake,
    pipeline,
    reviews,
    mapping,
    placeMapping,
    rates,
    overlayRules,
    marginFloors,
    overlays,
    exportWorkbook,
    workspaces: new WorkspaceManager(blob),
    repos: {
      rfps: rfpRepo,
      templates: templateRepo,
      reviews: reviewRepo,
      fillReports,
      fillMappings,
      overlayRules: overlayRulesRepo,
      marginFloors: marginFloorsRepo,
      emailIntegrations,
    },
  }
}

export type AppContext = ReturnType<typeof createAppContext>
