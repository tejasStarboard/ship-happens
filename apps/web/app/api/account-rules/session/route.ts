import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/auth/session"
import { jsonDomainError } from "@/lib/domain/http"
import {
  registerAccountRulesSession,
  unregisterAccountRulesSession,
} from "@/lib/account-rules/workspace"
import { isValidSessionId } from "@/lib/workspace-fs"

export async function POST(request: Request) {
  try {
    const { organizationId, session } = await requireOrgSession()
    const body = (await request.json()) as {
      sessionId?: unknown
      organizationId?: unknown
      userId?: unknown
    }

    if (
      typeof body.sessionId !== "string" ||
      !isValidSessionId(body.sessionId)
    ) {
      return NextResponse.json(
        { error: "Valid sessionId is required" },
        { status: 400 }
      )
    }

    if (
      typeof body.organizationId === "string" &&
      body.organizationId !== organizationId
    ) {
      return NextResponse.json(
        { error: "Organization mismatch" },
        { status: 403 }
      )
    }

    if (typeof body.userId === "string" && body.userId !== session.user.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 })
    }

    const bind = await registerAccountRulesSession({
      sessionId: body.sessionId,
      organizationId,
      userId: session.user.id,
    })
    return NextResponse.json(bind)
  } catch (error) {
    return jsonDomainError(error, "Failed to register account-rules session")
  }
}

export async function DELETE(request: Request) {
  try {
    await requireOrgSession()
    const url = new URL(request.url)
    const sessionId = url.searchParams.get("sessionId")?.trim() ?? ""
    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json(
        { error: "Valid sessionId is required" },
        { status: 400 }
      )
    }
    await unregisterAccountRulesSession(sessionId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return jsonDomainError(error, "Failed to unregister account-rules session")
  }
}
