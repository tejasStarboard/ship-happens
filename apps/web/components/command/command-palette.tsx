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
} from "@workspace/ui/components/command"

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

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
      title="Command palette"
      description="Jump to a page or start a fill"
    >
      <CommandInput placeholder="Search fills, templates, rates…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
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
      </CommandList>
    </CommandDialog>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
