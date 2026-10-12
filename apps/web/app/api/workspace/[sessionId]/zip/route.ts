import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getServerSession } from "@/lib/session";
import { collectSyncFiles, isValidSessionId } from "@/lib/workspace-fs";

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly sessionId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId: workspaceId } = await context.params;
  if (!isValidSessionId(workspaceId)) {
    return NextResponse.json({ error: "Invalid workspace id" }, { status: 400 });
  }

  try {
    const files = await collectSyncFiles(workspaceId);
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.path, file.bytes);
    }
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${workspaceId}.zip"`,
        "content-length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to zip workspace" },
      { status: 500 },
    );
  }
}
