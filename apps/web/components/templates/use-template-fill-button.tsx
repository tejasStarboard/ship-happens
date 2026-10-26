"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconPlayerPlay } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@ship-happens/ui/components/button"
import { createFillFromTemplate } from "@/lib/server/actions/intake"

export function UseTemplateFillButton({
  templateId,
  templateName,
}: {
  templateId: string
  templateName: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    try {
      const result = await createFillFromTemplate({
        templateId,
        name: `${templateName} fill`,
      })
      toast.success("Fill created from template")
      router.push(`/rfp/${result.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create fill"
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Button size="sm" onClick={onClick} disabled={pending}>
      <IconPlayerPlay data-icon="inline-start" />
      {pending ? "Starting…" : "Use in fill"}
    </Button>
  )
}
