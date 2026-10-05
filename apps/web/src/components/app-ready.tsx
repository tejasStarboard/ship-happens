import { useEffect } from "react"

/** Marks the document when client React has hydrated (for e2e). */
export function AppReady() {
  useEffect(() => {
    document.documentElement.dataset.appReady = "true"
    return () => {
      delete document.documentElement.dataset.appReady
    }
  }, [])

  return null
}
