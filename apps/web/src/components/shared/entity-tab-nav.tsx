import { Link } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"

export type EntityTab<T extends string> = {
  id: T
  label: string
  to: NonNullable<LinkProps["to"]>
  disabled?: boolean
}

type EntityTabNavProps<T extends string> = {
  tabs: EntityTab<T>[]
  activeTab: T
  params: LinkProps["params"]
}

export function EntityTabNav<T extends string>({
  tabs,
  activeTab,
  params,
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
            to={tab.to}
            // Params are route-specific; callers pass the matching shape.
            params={params as never}
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
