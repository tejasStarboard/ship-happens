import { NextResponse } from "next/server";
import path from "node:path";
import { getServerSession } from "@/lib/session";
import { isValidSessionId, writeWorkspaceFile } from "@/lib/workspace-fs";

export async function POST(
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

  const form = await request.formData();
  const directory = typeof form.get("directory") === "string" ? String(form.get("directory")) : "";
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const written: string[] = [];
  for (const file of files) {
    const safeName = path.basename(file.name).replace(/[^\w.-]+/g, "_") || "upload.bin";
    const relative = directory ? `${directory.replace(/^\/+|\/+$/g, "")}/${safeName}` : safeName;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeWorkspaceFile(sessionId, relative, bytes);
    written.push(relative);
  }

  return NextResponse.json({ ok: true, files: written });
}
