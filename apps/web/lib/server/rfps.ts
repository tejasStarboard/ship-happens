import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rfps, templates } from "@/lib/db/schema";
import { MOCK_RFPS, type RfpStatus } from "@/lib/mock/rfps";
import { requireOrgSession } from "@/lib/server/session";

export type RfpListItem = {
  id: string;
  name: string;
  customer: string;
  status: RfpStatus;
  templateName: string;
  updatedAt: string;
  owner: string;
};

function asRfpStatus(value: string): RfpStatus {
  switch (value) {
    case "queued":
    case "running":
    case "needs_review":
    case "done":
    case "failed":
      return value;
    case "cancelled":
      return "failed";
    default:
      return "queued";
  }
}

function demoRfpId(organizationId: string, mockId: string) {
  // Global PK — scope demo ids per org so tenants don't collide.
  return `${mockId}__${organizationId}`;
}

/** Seed demo RFPs into Postgres once per org so the UI matches prior mock data. */
async function seedDemoRfpsIfEmpty(
  organizationId: string,
  ownerUserId: string,
): Promise<void> {
  const existing = await db
    .select({ id: rfps.id })
    .from(rfps)
    .where(eq(rfps.organizationId, organizationId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(rfps).values(
    MOCK_RFPS.map((rfp) => ({
      id: demoRfpId(organizationId, rfp.id),
      organizationId,
      name: rfp.name,
      customer: rfp.customer,
      status: rfp.status,
      ownerUserId,
      metadata: {
        templateName: rfp.templateName,
        demoSeed: true,
        mockId: rfp.id,
      },
      updatedAt: new Date(rfp.updatedAt),
      createdAt: new Date(rfp.updatedAt),
    })),
  );
}

export async function listOrgRfps(): Promise<RfpListItem[]> {
  const { organizationId, session } = await requireOrgSession();
  await seedDemoRfpsIfEmpty(organizationId, session.user.id);

  const rows = await db
    .select({
      id: rfps.id,
      name: rfps.name,
      customer: rfps.customer,
      status: rfps.status,
      metadata: rfps.metadata,
      updatedAt: rfps.updatedAt,
      templateName: templates.name,
      ownerName: rfps.ownerUserId,
    })
    .from(rfps)
    .leftJoin(templates, eq(rfps.templateId, templates.id))
    .where(eq(rfps.organizationId, organizationId))
    .orderBy(desc(rfps.updatedAt));

  return rows.map((row) => {
    const meta = (row.metadata ?? {}) as { templateName?: string };
    return {
      id: row.id,
      name: row.name,
      customer: row.customer ?? "—",
      status: asRfpStatus(row.status),
      templateName: row.templateName ?? meta.templateName ?? "—",
      updatedAt: row.updatedAt.toISOString(),
      owner: session.user.name ?? row.ownerName,
    };
  });
}

export async function getOrgRfp(id: string): Promise<RfpListItem | null> {
  const { organizationId, session } = await requireOrgSession();
  await seedDemoRfpsIfEmpty(organizationId, session.user.id);

  const row = await db
    .select({
      id: rfps.id,
      name: rfps.name,
      customer: rfps.customer,
      status: rfps.status,
      metadata: rfps.metadata,
      updatedAt: rfps.updatedAt,
      templateName: templates.name,
      ownerName: rfps.ownerUserId,
    })
    .from(rfps)
    .leftJoin(templates, eq(rfps.templateId, templates.id))
    .where(and(eq(rfps.id, id), eq(rfps.organizationId, organizationId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return null;

  const meta = (row.metadata ?? {}) as { templateName?: string };
  return {
    id: row.id,
    name: row.name,
    customer: row.customer ?? "—",
    status: asRfpStatus(row.status),
    templateName: row.templateName ?? meta.templateName ?? "—",
    updatedAt: row.updatedAt.toISOString(),
    owner: session.user.name ?? row.ownerName,
  };
}
