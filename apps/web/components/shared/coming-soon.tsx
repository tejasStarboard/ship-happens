import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ship-happens/ui/components/empty"

/** Honest stub / placeholder for unwired product surfaces. */
export function ComingSoonEmpty({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Empty className="min-h-[280px] border border-dashed border-border bg-card">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
