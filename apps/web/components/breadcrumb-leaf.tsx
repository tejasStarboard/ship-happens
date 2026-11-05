"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type BreadcrumbLeafContextValue = {
  leafLabel: string | null
  setLeafLabel: (label: string | null) => void
}

const BreadcrumbLeafContext = createContext<BreadcrumbLeafContextValue | null>(
  null
)

export function BreadcrumbLeafProvider({
  children,
}: {
  readonly children: ReactNode
}) {
  const [leafLabel, setLeafLabelState] = useState<string | null>(null)
  const setLeafLabel = useCallback((label: string | null) => {
    setLeafLabelState(label)
  }, [])
  const value = useMemo(
    () => ({ leafLabel, setLeafLabel }),
    [leafLabel, setLeafLabel]
  )
  return (
    <BreadcrumbLeafContext.Provider value={value}>
      {children}
    </BreadcrumbLeafContext.Provider>
  )
}

export function useBreadcrumbLeafLabel() {
  return useContext(BreadcrumbLeafContext)?.leafLabel ?? null
}

/** Registers the current page leaf crumb; clears on unmount. */
export function useSetBreadcrumbLeaf(label: string | null) {
  const ctx = useContext(BreadcrumbLeafContext)
  useEffect(() => {
    if (!ctx) return
    ctx.setLeafLabel(label)
    return () => ctx.setLeafLabel(null)
  }, [ctx, label])
}
