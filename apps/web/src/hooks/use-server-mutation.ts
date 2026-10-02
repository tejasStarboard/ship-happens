import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import * as React from "react"

type MutateOptions = {
  successMessage?: string
  errorMessage?: string
  invalidate?: boolean
}

/**
 * Wraps an async server mutation with toast + optional router invalidate.
 */
export function useServerMutation() {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const mutate = React.useCallback(
    async <T>(fn: () => Promise<T>, options: MutateOptions = {}) => {
      const {
        successMessage,
        errorMessage = "Something went wrong",
        invalidate = true,
      } = options
      setPending(true)
      try {
        const result = await fn()
        if (successMessage) toast.success(successMessage)
        if (invalidate) void router.invalidate()
        return result
      } catch (error) {
        toast.error(error instanceof Error ? error.message : errorMessage)
        throw error
      } finally {
        setPending(false)
      }
    },
    [router]
  )

  return { mutate, pending }
}
