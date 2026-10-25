import { db } from "@/lib/db"
import {
  FillPipelineManager,
  IntakeService,
  ReviewItemRepository,
  ReviewItemService,
  RfpRepository,
  type AppDb,
  type BlobStore,
  type WorkspaceHost,
} from "@ship-happens/fill"
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
  const reviews = new ReviewItemService(reviewRepo, rfpRepo)

  return {
    db: database,
    blob,
    createStarboardClient: starboardFactory,
    rfps: new RfpService(rfpRepo, pipeline, reviews),
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
    workspaces: new WorkspaceManager(blob),
    repos: {
      rfps: rfpRepo,
      templates: templateRepo,
      reviews: reviewRepo,
    },
  }
}

export type AppContext = ReturnType<typeof createAppContext>
