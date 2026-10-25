/**
 * @deprecated Import from `@/lib/auth/session` instead.
 * Re-exports kept for existing callers during the layering migration.
 */
export {
  getOptionalOrgSession,
  getServerSession,
  getSession,
  orgSessionStore,
  requireOrgSession,
  requireOrgWorkspaceAccess,
  requireSession,
  type OrgSession,
  type OrgSessionContext,
} from "@/lib/auth/session"
