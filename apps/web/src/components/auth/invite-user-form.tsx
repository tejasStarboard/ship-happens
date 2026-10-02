import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { authClient } from "@/lib/auth/client"

const roleItems = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
  { label: "Owner", value: "owner" },
] as const

const inviteSchema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(["member", "admin", "owner"]),
})

type InviteUserFormProps = {
  onInvited?: () => void
  /** Skip Card chrome when nesting inside a dialog/sheet. */
  embedded?: boolean
}

export function InviteUserForm({
  onInvited,
  embedded = false,
}: InviteUserFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: "",
      role: "member" as "member" | "admin" | "owner",
    },
    validators: {
      onSubmit: inviteSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)
      setSuccess(null)

      const { error } = await authClient.organization.inviteMember({
        email: value.email.trim(),
        role: value.role,
      })

      if (error) {
        setFormError(error.message ?? "Could not send invitation")
        return
      }

      setSuccess(`Invitation sent to ${value.email}`)
      form.reset()
      onInvited?.()
    },
  })

  const formFields = (
    <form
      id="invite-user-form"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="role">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid || undefined}>
                <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                <Select
                  items={[...roleItems]}
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (value === null) return
                    field.handleChange(value as "member" | "admin" | "owner")
                  }}
                >
                  <SelectTrigger
                    id={field.name}
                    className="w-full"
                    aria-invalid={isInvalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {roleItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>
    </form>
  )

  const alerts = (
    <>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {success && !embedded ? (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}
    </>
  )

  const submitButton = (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          type="submit"
          form="invite-user-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          {isSubmitting ? "Sending…" : "Send invite"}
        </Button>
      )}
    </form.Subscribe>
  )

  if (embedded) {
    return (
      <div className="flex flex-col gap-3">
        {formFields}
        {alerts}
        {submitButton}
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Invite member</CardTitle>
        <CardDescription>
          Send an invitation to join the active organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {formFields}
        {alerts}
      </CardContent>
      <CardFooter>{submitButton}</CardFooter>
    </Card>
  )
}
