"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { IconPencil } from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { authClient } from "@/lib/auth/client"
import { getInitials } from "@/lib/shared/string"

type ProfileUpdate = {
  name?: string
  image?: string | null
  username?: string | null
}

async function updateProfile(data: ProfileUpdate) {
  return authClient.updateUser(
    data as Parameters<typeof authClient.updateUser>[0]
  )
}

const MAX_AVATAR_BYTES = 500_000

const profileSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(100),
  username: z
    .string()
    .trim()
    .max(30, "Max 30 characters")
    .refine(
      (value) => value === "" || /^[a-zA-Z0-9_.]+$/.test(value),
      "Letters, numbers, underscores, and periods only"
    )
    .refine(
      (value) => value === "" || value.length >= 2,
      "At least 2 characters"
    ),
})

export type ProfileUser = {
  name: string
  email: string
  image: string | null
  username: string | null
}

type ProfileFormProps = {
  user: ProfileUser
  organization: { id: string; name: string } | null
}

function ProfileRow({
  title,
  description,
  control,
  bordered = true,
}: {
  title: string
  description?: string
  control: React.ReactNode
  bordered?: boolean
}) {
  return (
    <div
      className={
        bordered
          ? "flex items-start justify-between gap-4 border-b px-4 py-3"
          : "flex items-start justify-between gap-4 px-4 py-3"
      }
    >
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

export function ProfileForm({ user, organization }: ProfileFormProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [image, setImage] = React.useState(user.image)
  const [avatarBusy, setAvatarBusy] = React.useState(false)
  const [leaveBusy, setLeaveBusy] = React.useState(false)

  React.useEffect(() => {
    setImage(user.image)
  }, [user.image])

  const form = useForm({
    defaultValues: {
      name: user.name,
      username: user.username ?? "",
    },
    validators: { onSubmit: profileSchema },
    onSubmit: async ({ value }) => {
      const username = value.username.trim()
      const { error } = await updateProfile({
        name: value.name.trim(),
        username: username.length > 0 ? username : null,
      })
      if (error) {
        toast.error(error.message || "Could not update profile")
        return
      }
      toast.success("Profile updated")
      void router.invalidate()
    },
  })

  async function saveField(field: "name" | "username") {
    const value = form.state.values[field]
    const parsed = profileSchema.safeParse({
      name: field === "name" ? value : form.state.values.name,
      username: field === "username" ? value : form.state.values.username,
    })
    if (!parsed.success) return

    const nextName = parsed.data.name.trim()
    const nextUsername = parsed.data.username.trim()

    if (field === "name" && nextName === user.name) return
    if (
      field === "username" &&
      (nextUsername || null) === (user.username || null)
    ) {
      return
    }

    const { error } = await updateProfile({
      ...(field === "name" ? { name: nextName } : {}),
      ...(field === "username"
        ? { username: nextUsername.length > 0 ? nextUsername : null }
        : {}),
    })
    if (error) {
      toast.error(error.message || "Could not update profile")
      return
    }
    toast.success("Profile updated")
    void router.invalidate()
  }

  async function onAvatarSelected(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 500KB")
      return
    }

    setAvatarBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result)
          else reject(new Error("Could not read image"))
        }
        reader.onerror = () => reject(new Error("Could not read image"))
        reader.readAsDataURL(file)
      })

      const { error } = await updateProfile({ image: dataUrl })
      if (error) {
        toast.error(error.message || "Could not update photo")
        return
      }
      setImage(dataUrl)
      toast.success("Profile picture updated")
      void router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setAvatarBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function onLeaveWorkspace() {
    if (!organization) return
    setLeaveBusy(true)
    try {
      const { error } = await authClient.organization.leave({
        organizationId: organization.id,
      })
      if (error) {
        toast.error(error.message || "Could not leave workspace")
        return
      }
      toast.success(`Left ${organization.name}`)
      void navigate({ to: "/select-org" })
    } finally {
      setLeaveBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
        className="overflow-hidden rounded-lg border"
      >
        <div className="flex items-center justify-center border-b px-4 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void onAvatarSelected(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={avatarBusy}
            onClick={() => fileInputRef.current?.click()}
            className="group relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Change profile picture"
          >
            <Avatar className="size-32">
              {image ? <AvatarImage src={image} alt={user.name} /> : null}
              <AvatarFallback>
                {avatarBusy ? (
                  <Spinner className="size-5" />
                ) : (
                  getInitials(user.name)
                )}
              </AvatarFallback>
            </Avatar>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <IconPencil className="size-5 opacity-80" />
            </span>
          </button>
        </div>

        <ProfileRow
          title="Email"
          control={
            <span className="text-sm text-muted-foreground">{user.email}</span>
          }
        />

        <form.Field name="name">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <ProfileRow
                title="Full name"
                control={
                  <Field data-invalid={invalid || undefined} className="w-56">
                    <FieldLabel htmlFor={field.name} className="sr-only">
                      Full name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      aria-invalid={invalid || undefined}
                      className="h-8"
                      onBlur={() => {
                        field.handleBlur()
                        void saveField("name")
                      }}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {invalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                }
              />
            )
          }}
        </form.Field>

        <form.Field name="username">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <ProfileRow
                title="Username"
                description="One word, like a nickname or first name"
                bordered={false}
                control={
                  <Field data-invalid={invalid || undefined} className="w-56">
                    <FieldLabel htmlFor={field.name} className="sr-only">
                      Username
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      aria-invalid={invalid || undefined}
                      className="h-8"
                      placeholder="username"
                      onBlur={() => {
                        field.handleBlur()
                        void saveField("username")
                      }}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {invalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                }
              />
            )
          }}
        </form.Field>
      </form>

      {organization ? (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-base font-semibold tracking-tight">
            Workspace access
          </h2>
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="text-sm">Remove yourself from workspace</p>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={leaveBusy}
                    />
                  }
                >
                  {leaveBusy ? "Leaving…" : "Leave workspace"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will lose access to {organization.name}. You can be
                      invited back later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => void onLeaveWorkspace()}
                    >
                      Leave workspace
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
