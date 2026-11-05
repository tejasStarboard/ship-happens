"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Input } from "@ship-happens/ui/components/input"
import { cn } from "@ship-happens/ui/lib/utils"
import type { LocationSearchHit } from "@/app/api/locations/search/route"

type LocodeComboboxProps = {
  id?: string
  value: string
  onChange: (locode: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Empty string means org-wide wildcard / optional. */
  allowClear?: boolean
  clearHint?: string
}

async function searchLocations(query: string): Promise<LocationSearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const res = await fetch(
    `/api/locations/search?q=${encodeURIComponent(q)}`,
    { credentials: "same-origin" }
  )
  if (!res.ok) return []
  const body = (await res.json()) as { options?: LocationSearchHit[] }
  return body.options ?? []
}

export function LocodeCombobox({
  id,
  value,
  onChange,
  placeholder = "Search port…",
  disabled,
  className,
  allowClear = true,
  clearHint = "Leave empty for any port",
}: LocodeComboboxProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<LocationSearchHit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setText(value)
  }, [value])

  useEffect(() => {
    const q = text.trim()
    if (q.length < 2) {
      setOptions([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const handle = window.setTimeout(() => {
      void searchLocations(q).then((hits) => {
        if (cancelled) return
        setOptions(hits)
        setLoading(false)
      })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [text])

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  function pick(locode: string) {
    onChange(locode)
    setText(locode)
    setOpen(false)
  }

  function clear() {
    onChange("")
    setText("")
    setOptions([])
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn("relative grid gap-1", className)}>
      <Input
        id={inputId}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          setOpen(true)
          if (!next.trim() && allowClear) onChange("")
        }}
        onBlur={() => {
          // Commit typed UN/LOCODE if it looks like one and no pick happened.
          const trimmed = text.trim().toUpperCase()
          if (/^[A-Z]{5}$/.test(trimmed) && trimmed !== value) {
            onChange(trimmed)
            setText(trimmed)
          } else if (!trimmed && allowClear) {
            onChange("")
          } else if (value) {
            setText(value)
          }
        }}
      />
      {open && text.trim().length >= 2 ? (
        <div className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {loading ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Searching…
            </p>
          ) : options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No ports found
            </p>
          ) : (
            options.map((hit) => (
              <button
                key={`${hit.locode}-${hit.label}`}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(hit.locode)}
              >
                <span className="font-medium">{hit.locode}</span>
                <span className="truncate text-muted-foreground">
                  {hit.city || hit.country
                    ? [hit.city, hit.country].filter(Boolean).join(", ")
                    : hit.label}
                </span>
              </button>
            ))
          )}
          {allowClear && value ? (
            <button
              type="button"
              className="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clear}
            >
              Clear (any port)
            </button>
          ) : null}
        </div>
      ) : null}
      {allowClear ? (
        <p className="text-[11px] text-muted-foreground">{clearHint}</p>
      ) : null}
    </div>
  )
}
