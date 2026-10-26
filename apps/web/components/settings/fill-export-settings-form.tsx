"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import type { UnexpectedFeeMode } from "@ship-happens/fill/browser"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ship-happens/ui/components/select"
import {
  getFillOrgSettings,
  updateFillOrgSettings,
} from "@/lib/server/actions/fill-org-settings"

const MODE_OPTIONS = [
  {
    value: "soft_warn" as const,
    label: "Soft warn",
    description:
      "Show a warning dialog before export; export can continue after acknowledge.",
  },
  {
    value: "hard_block" as const,
    label: "Hard block",
    description:
      "Block export until unexpected-fee reviews are resolved on the fill Review tab.",
  },
] as const

export function FillExportSettingsForm() {
  const [mode, setMode] = useState<UnexpectedFeeMode>("soft_warn")
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    void getFillOrgSettings().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setMode(result.settings.unexpectedFeeMode)
      } else {
        toast.error(result.error)
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function onModeChange(next: string | null) {
    if (next !== "soft_warn" && next !== "hard_block") return
    const previous = mode
    setMode(next)
    startTransition(async () => {
      const result = await updateFillOrgSettings({ unexpectedFeeMode: next })
      if (!result.ok) {
        setMode(previous)
        toast.error(result.error)
        return
      }
      toast.success("Fill export setting saved")
    })
  }

  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0 pr-4">
          <p className="text-sm font-medium">Unexpected fees on export</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When Starboard resolve returns sell fees that are not bound to BCO
            fee columns. Change anytime; soft-warn dialogs also link here.
          </p>
        </div>
        <Select
          value={mode}
          disabled={!loaded || pending}
          onValueChange={onModeChange}
        >
          <SelectTrigger className="w-[160px]" aria-label="Unexpected fee mode">
            <SelectValue>
              {MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="px-4 py-3 text-xs text-muted-foreground">
        {MODE_OPTIONS.find((o) => o.value === mode)?.description}{" "}
        <Link
          href="/settings/fill-export"
          className="underline underline-offset-2"
        >
          Settings → Fill export
        </Link>
      </div>
    </div>
  )
}
