import { useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useNavigate } from "@tanstack/react-router"
import { IconArrowLeft, IconUpload } from "@tabler/icons-react"
import { z } from "zod"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AuthBody,
  AuthCard,
  AuthFooter,
  AuthHeader,
} from "@/components/auth/auth-shell"
import { authClient } from "@/lib/auth/client"
import {
  ALLOWED_ORG_LOGO_TYPES,
  MAX_ORG_LOGO_BYTES,
  uploadOrgLogo,
} from "@/lib/storage/org-logo"

const createOrgSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens"
    ),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Could not read logo file"))
        return
      }
      const comma = result.indexOf(",")
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error("Could not read logo file"))
    reader.readAsDataURL(file)
  })
}

export function CreateOrgForm({
  onCancel,
  uploadLogo = uploadOrgLogo,
}: {
  onCancel?: () => void
  /** Server upload fn — default is Vercel Blob `uploadOrgLogo`. */
  uploadLogo?: typeof uploadOrgLogo
}) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
    },
    validators: {
      onSubmit: createOrgSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null)
      let logoUrl: string | undefined

      try {
        if (logoFile) {
          setLogoUploading(true)
          const base64 = await fileToBase64(logoFile)
          const uploaded = await uploadLogo({
            data: {
              fileName: logoFile.name,
              contentType:
                logoFile.type as (typeof ALLOWED_ORG_LOGO_TYPES)[number],
              base64,
            },
          })
          logoUrl = uploaded.url
        }

        const { data, error } = await authClient.organization.create({
          name: value.name.trim(),
          slug: value.slug.trim(),
          ...(logoUrl ? { logo: logoUrl } : {}),
        })
        if (error) {
          setFormError(error.message ?? "Could not create organization")
          return
        }

        if (data?.id) {
          await authClient.organization.setActive({ organizationId: data.id })
        }

        await navigate({ to: "/rfp" })
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Could not create organization"
        )
      } finally {
        setLogoUploading(false)
      }
    },
  })

  function clearLogo() {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl)
    }
    setLogoFile(null)
    setLogoPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function onLogoSelected(file: File | undefined) {
    setFormError(null)
    if (!file) {
      clearLogo()
      return
    }

    if (
      !ALLOWED_ORG_LOGO_TYPES.includes(
        file.type as (typeof ALLOWED_ORG_LOGO_TYPES)[number]
      )
    ) {
      setFormError("Logo must be a JPEG, PNG, WebP, or GIF image")
      clearLogo()
      return
    }

    if (file.size > MAX_ORG_LOGO_BYTES) {
      setFormError("Logo must be 10MB or smaller")
      clearLogo()
      return
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl)
    }
    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <AuthCard>
      <AuthBody>
        <AuthHeader
          title="Create organization"
          description="Set up a workspace for your team and projects."
        />

        <form
          id="create-org-form"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="org-logo-upload">Logo</FieldLabel>
              <div className="flex items-center gap-3">
                <Avatar className="size-14 rounded-lg border border-dashed border-border after:rounded-lg">
                  {logoPreviewUrl ? (
                    <AvatarImage
                      src={logoPreviewUrl}
                      alt="Organization logo preview"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-muted/50 text-muted-foreground">
                    <IconUpload className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      id="org-logo-upload"
                      type="file"
                      accept={ALLOWED_ORG_LOGO_TYPES.join(",")}
                      className="sr-only"
                      onChange={(e) => onLogoSelected(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={logoUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoFile ? "Change" : "Upload"}
                    </Button>
                    {logoFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={logoUploading}
                        onClick={clearLogo}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <FieldDescription>
                    Recommended size 1:1, up to 10MB.
                  </FieldDescription>
                </div>
              </div>
            </Field>

            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="Acme Inc"
                      className="h-10"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const name = e.target.value
                        field.handleChange(name)
                        if (!slugTouched) {
                          form.setFieldValue("slug", slugify(name))
                        }
                      }}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="slug">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Slug URL</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="my-org"
                      className="h-10"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        setSlugTouched(true)
                        field.handleChange(slugify(e.target.value))
                      }}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>
        </form>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                form="create-org-form"
                size="lg"
                className="h-10 w-full"
                disabled={isSubmitting || logoUploading}
              >
                {isSubmitting || logoUploading ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                {logoUploading
                  ? "Uploading logo…"
                  : isSubmitting
                    ? "Creating…"
                    : "Create Organization"}
              </Button>
            )}
          </form.Subscribe>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onCancel}
            >
              <IconArrowLeft data-icon="inline-start" />
              Back
            </Button>
          ) : null}
        </div>
      </AuthBody>

      <AuthFooter>
        Want to switch to different account?{" "}
        <Button
          variant="link"
          className="h-auto p-0 px-1"
          onClick={async () => {
            await authClient.signOut()
            await navigate({ to: "/sign-in" })
          }}
        >
          Logout
        </Button>
      </AuthFooter>
    </AuthCard>
  )
}
