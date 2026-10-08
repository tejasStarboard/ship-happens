import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  deleteWorkspacePath,
  isTextPath,
  isValidSessionId,
  readWorkspaceFile,
  renameWorkspacePath,
  writeWorkspaceFile,
} from "@/lib/workspace-fs";

function pathFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const filePath = url.searchParams.get("path");
  return filePath && filePath.length > 0 ? filePath : null;
}

export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const filePath = pathFromRequest(request);
  if (!isValidSessionId(sessionId) || !filePath) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const file = await readWorkspaceFile(sessionId, filePath);
    if (file.encoding === "utf-8") {
      return NextResponse.json({
        path: filePath,
        encoding: "utf-8",
        content: file.content,
        size: file.size,
        editable: isTextPath(filePath),
      });
    }
    return NextResponse.json({
      path: filePath,
      encoding: "binary",
      content: null,
      size: file.size,
      editable: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read file" },
      { status: 404 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const body = (await request.json()) as { path?: unknown; content?: unknown };
  if (typeof body.path !== "string" || typeof body.content !== "string") {
    return NextResponse.json({ error: "path and content required" }, { status: 400 });
  }
  if (!isTextPath(body.path)) {
    return NextResponse.json({ error: "Only text files can be edited" }, { status: 400 });
  }

  try {
    await writeWorkspaceFile(sessionId, body.path, body.content);
    return NextResponse.json({ ok: true, path: body.path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write file" },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const body = (await request.json()) as { from?: unknown; to?: unknown };
  if (typeof body.from !== "string" || typeof body.to !== "string") {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  try {
    await renameWorkspacePath(sessionId, body.from, body.to);
    return NextResponse.json({ ok: true, from: body.from, to: body.to });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rename" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const filePath = pathFromRequest(request);
  if (!isValidSessionId(sessionId) || !filePath) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await deleteWorkspacePath(sessionId, filePath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 400 },
    );
  }
}
