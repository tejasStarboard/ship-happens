"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  IconCurrencyDollar,
  IconFileSpreadsheet,
  IconHelp,
  IconLayersSubtract,
  IconSettings,
  IconTemplate,
  IconPlus,
} from "@tabler/icons-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@ship-happens/ui/components/command"
import {
  getCommandPaletteIndex,
  type CommandPaletteIndex,
} from "@/lib/server/actions/command-palette"

const NAV = [
  { title: "Fill desk", href: "/rfp", icon: IconFileSpreadsheet, keys: "G F" },
  { title: "Templates", href: "/templates", icon: IconTemplate, keys: "G T" },
  {
    title: "Starboard rates",
    href: "/rates",
    icon: IconCurrencyDollar,
    keys: "G R",
  },
  {
    title: "Overlays",
    href: "/overlays",
    icon: IconLayersSubtract,
    keys: "G O",
  },
  { title: "Settings", href: "/settings", icon: IconSettings, keys: "G S" },
  { title: "Help", href: "/help", icon: IconHelp, keys: "G H" },
] as const

const EMPTY_INDEX: CommandPaletteIndex = {
  fills: [],
  templates: [],
  overlays: [],
}

function searchValue(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [index, setIndex] = useState<CommandPaletteIndex>(EMPTY_INDEX)
  const [loadingIndex, setLoadingIndex] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(!isOpen)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, setOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoadingIndex(true)
    void (async () => {
      const result = await getCommandPaletteIndex()
      if (cancelled) return
      if (result.ok) setIndex(result.data)
      setLoadingIndex(false)
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
      title="Command palette"
      description="Jump to a page, fill, template, or overlay"
    >
      <CommandInput placeholder="Search fills, templates, overlays…" />
      <CommandList>
        <CommandEmpty>{loadingIndex ? "Loading…" : "No matches."}</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => go(item.href)}
            >
              <item.icon />
              {item.title}
              <CommandShortcut>{item.keys}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem value="new fill" onSelect={() => go("/rfp")}>
            <IconPlus />
            New fill
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {index.fills.length > 0 ? (
          <CommandGroup heading="Fills">
            {index.fills.map((fill) => (
              <CommandItem
                key={fill.id}
                value={searchValue("fill", fill.name, fill.customer)}
                onSelect={() => go(`/rfp/${fill.id}`)}
              >
                <IconFileSpreadsheet />
                <span className="truncate">{fill.name}</span>
                {fill.customer ? (
                  <span className="truncate text-muted-foreground">
                    {fill.customer}
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {index.templates.length > 0 ? (
          <CommandGroup heading="Templates">
            {index.templates.map((template) => (
              <CommandItem
                key={template.id}
                value={searchValue(
                  "template",
                  template.name,
                  template.customer
                )}
                onSelect={() => go(`/templates/${template.id}`)}
              >
                <IconTemplate />
                <span className="truncate">{template.name}</span>
                {template.customer ? (
                  <span className="truncate text-muted-foreground">
                    {template.customer}
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {index.overlays.length > 0 ? (
          <CommandGroup heading="Overlays">
            {index.overlays.map((overlay) => (
              <CommandItem
                key={overlay.id}
                value={searchValue("overlay", overlay.name, overlay.customer)}
                onSelect={() => go("/overlays")}
              >
                <IconLayersSubtract />
                <span className="truncate">{overlay.name}</span>
                {overlay.customer ? (
                  <span className="truncate text-muted-foreground">
                    {overlay.customer}
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
