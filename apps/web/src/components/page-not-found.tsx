import { Link } from "@tanstack/react-router"
import { IconFileUnknown, IconHome } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"

export function PageNotFound() {
  return (
    <main className="grid min-h-[calc(100svh-var(--header-height,0px))] w-full place-items-center p-6">
      <Empty className="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconFileUnknown aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" render={<Link to="/" />} nativeButton={false}>
            <IconHome data-icon="inline-start" />
            Go home
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
