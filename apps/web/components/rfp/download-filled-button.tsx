"use client"

import { Button } from "@ship-happens/ui/components/button"

const NO_EXPORT_HINT =
  "Run Export filled to write sells into the original template. Download unlocks after final export sign-off."

/** Overview / header helper copy for the filled-workbook download gate. */
export function downloadFilledStatusMessage(
  filledFileUrl: string | null,
  blockedReason: string | null
): string {
  if (filledFileUrl) {
    return "Latest signed-off export is ready to download."
  }
  if (blockedReason) return blockedReason
  return NO_EXPORT_HINT
}

/**
 * Overview + header download for the cell-compliant filled workbook.
 * URL is only set after final export sign-off Confirm (see resolveExportDownloadGate).
 */
export function DownloadFilledButton({
  filledFileUrl,
  blockedReason,
}: {
  filledFileUrl: string | null
  blockedReason: string | null
}) {
  if (filledFileUrl) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={
          <a href={filledFileUrl} target="_blank" rel="noreferrer" download />
        }
        nativeButton={false}
      >
        Download filled
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled
      title={blockedReason ?? NO_EXPORT_HINT}
    >
      Download filled
    </Button>
  )
}
