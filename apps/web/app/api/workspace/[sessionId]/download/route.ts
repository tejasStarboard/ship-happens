import { NextResponse } from "next/server";
import path from "node:path";
import { getServerSession } from "@/lib/session";
import { isValidSessionId, readWorkspaceFile } from "@/lib/workspace-fs";

export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  const filePath = new URL(request.url).searchParams.get("path");
  if (!isValidSessionId(sessionId) || !filePath) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const file = await readWorkspaceFile(sessionId, filePath);
    const bytes =
      file.encoding === "utf-8" ? Buffer.from(file.content, "utf8") : Buffer.from(file.content);
    const filename = path.basename(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "content-length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download" },
      { status: 404 },
    );
  }
}
