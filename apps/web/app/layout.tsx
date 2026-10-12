import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Toaster } from "@workspace/ui/components/sonner"
import { AppReady } from "@/components/app-ready"
import { ThemeMenu } from "@/components/theme-menu"
import { ThemeProvider } from "@/components/theme"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import "@workspace/ui/globals.css"

export const metadata: Metadata = {
  title: "Ship Happens",
  description: "RFP fill agent — Next.js + eve workspace.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#0B2F3F",
}

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossOrigin="anonymous"
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-svh">
        <ThemeProvider>
          <TooltipProvider>
            <AppReady />
            {children}
            <ThemeMenu />
            <Toaster closeButton richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
