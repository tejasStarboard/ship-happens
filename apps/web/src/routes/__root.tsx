import { GlobalErrorBoundary } from "@/components/global-error-boundary"
import { PageNotFound } from "@/components/page-not-found"
import { ThemeProvider } from "@/components/theme"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { Toaster } from "@workspace/ui/components/sonner"
import { APP_DESCRIPTION, pageMeta } from "@/lib/seo"

import appCss from "@workspace/ui/globals.css?url"

const defaultMeta = pageMeta({ description: APP_DESCRIPTION })

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "theme-color",
        content: "#0B2F3F",
      },
      {
        name: "msapplication-TileColor",
        content: "#0B2F3F",
      },
      ...defaultMeta.meta,
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Syne:wght@600;700&display=swap",
      },
      {
        rel: "icon",
        href: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        rel: "icon",
        href: "/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "48x48",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
        sizes: "180x180",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  notFoundComponent: () => <PageNotFound />,
  errorComponent: GlobalErrorBoundary,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh">
        <ThemeProvider>
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
