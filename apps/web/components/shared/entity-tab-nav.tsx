import Link from "next/link"
import { cn } from "@ship-happens/ui/lib/utils"

export type EntityTab<T extends string> = {
  id: T
  label: string
  href: string
  disabled?: boolean
}

type EntityTabNavProps<T extends string> = {
  tabs: EntityTab<T>[]
  activeTab: T
}

export function EntityTabNav<T extends string>({
  tabs,
  activeTab,
}: EntityTabNavProps<T>) {
  return (
    <nav className="flex items-center gap-1" aria-label="Sections">
      {tabs.map((tab) => {
        if (tab.disabled) {
          return (
            <span
              key={tab.id}
              className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm text-muted-foreground/50"
              title="Coming soon"
            >
              {tab.label}
            </span>
          )
        }

        const isActive = activeTab === tab.id
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
