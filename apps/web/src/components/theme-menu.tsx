import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  IconCheck,
  IconDeviceDesktop,
  IconMoon,
  IconSun,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
import { cn } from "@workspace/ui/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "system", label: "System", icon: IconDeviceDesktop },
] as const

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"]

export function ThemeMenu() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const active = (theme ?? "system") as ThemeValue
  const TriggerIcon = !mounted || resolvedTheme === "dark" ? IconMoon : IconSun

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <HoverCard>
        <HoverCardTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-full bg-background/90 shadow-md backdrop-blur-sm"
              aria-label="Change theme"
            />
          }
        >
          <TriggerIcon className="size-4" />
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-44 p-1"
        >
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Theme
          </p>
          <div className="flex flex-col gap-0.5">
            {THEME_OPTIONS.map((option) => {
              const selected = mounted && active === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none hover:bg-accent hover:text-accent-foreground",
                    selected && "bg-accent/70"
                  )}
                  onClick={() => setTheme(option.value)}
                >
                  <option.icon className="size-4 shrink-0 opacity-70" />
                  <span className="flex-1">{option.label}</span>
                  {selected ? (
                    <IconCheck className="size-3.5 shrink-0" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}
