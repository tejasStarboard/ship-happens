import { NextResponse } from "next/server"

const OFFICE_ERROR_MARKERS = [
  "Office Online services aren't available",
  "We're working to restore all services",
  "errorOccurred",
  "Something went wrong",
  "file could not be found",
  "We couldn't find the file you wanted",
] as const

function isPublicHttpUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false
    }
    const host = parsed.hostname.toLowerCase()
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local")
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

function looksLikeOfficeError(html: string) {
  const sample = html.slice(0, 80_000)
  return OFFICE_ERROR_MARKERS.some((marker) => sample.includes(marker))
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src")
  if (!src || !isPublicHttpUrl(src)) {
    return NextResponse.json({ ok: false, reason: "invalid_src" as const })
  }

  try {
    const fileRes = await fetch(src, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    })
    if (!fileRes.ok) {
      return NextResponse.json({
        ok: false,
        reason: "file_unreachable" as const,
      })
    }
  } catch {
    // Some storages reject HEAD; still try the Office embed page.
  }

  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`

  try {
    const embedRes = await fetch(embedUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; StarboardPreview/1.0; +https://starboard.trade)",
      },
    })

    if (!embedRes.ok) {
      return NextResponse.json({ ok: false, reason: "embed_http" as const })
    }

    const html = await embedRes.text()
    if (looksLikeOfficeError(html)) {
      return NextResponse.json({ ok: false, reason: "office_error" as const })
    }

    return NextResponse.json({ ok: true as const })
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "embed_fetch_failed" as const,
    })
  }
}
