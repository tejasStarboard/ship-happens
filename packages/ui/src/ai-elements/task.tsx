"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ship-happens/ui/components/collapsible"
import { cn } from "@ship-happens/ui/lib/utils"
import { ChevronDownIcon, SearchIcon } from "lucide-react"
import type { ComponentProps, ReactElement } from "react"
import { isValidElement } from "react"

export type TaskItemFileProps = ComponentProps<"div">

export const TaskItemFile = ({
  children,
  className,
  ...props
}: TaskItemFileProps) => (
  <div
    className={cn(
      "inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-xs text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export type TaskItemProps = ComponentProps<"div">

export const TaskItem = ({ children, className, ...props }: TaskItemProps) => (
  <div className={cn("text-sm text-muted-foreground", className)} {...props}>
    {children}
  </div>
)

export type TaskProps = ComponentProps<typeof Collapsible>

export const Task = ({
  defaultOpen = true,
  className,
  ...props
}: TaskProps) => (
  <Collapsible className={cn(className)} defaultOpen={defaultOpen} {...props} />
)

export type TaskTriggerProps = Omit<
  ComponentProps<typeof CollapsibleTrigger>,
  "render"
> & {
  title: string
  children?: ReactElement
}

export const TaskTrigger = ({
  children,
  className,
  title,
  ...props
}: TaskTriggerProps) => (
  <CollapsibleTrigger
    className={cn("group", className)}
    render={
      isValidElement(children) ? (
        children
      ) : (
        <div className="flex w-full cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <SearchIcon className="size-4" />
          <p className="text-sm">{title}</p>
          <ChevronDownIcon className="size-4 transition-transform group-data-open:rotate-180" />
        </div>
      )
    }
    {...props}
  />
)

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    className={cn(
      "text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2",
      className
    )}
    {...props}
  >
    <div className="mt-4 space-y-2 border-l-2 border-muted pl-4">
      {children}
    </div>
  </CollapsibleContent>
)
