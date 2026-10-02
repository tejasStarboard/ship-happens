import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { IconArrowRight, IconEye, IconEyeOff } from "@tabler/icons-react"
import { z } from "zod"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AuthBody,
  AuthCard,
  AuthDivider,
  AuthFooter,
  AuthHeader,
  GoogleIcon,
} from "@/components/auth/auth-shell"
import { authClient } from "@/lib/auth/client"

const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

export function SignInForm({
  redirectTo = "/select-org",
}: {
  redirectTo?: string
}) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const afterAuthPath = redirectTo || "/select-org"

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)

      const { error } = await authClient.signIn.email({
        email: value.email.trim(),
        password: value.password,
        callbackURL: afterAuthPath,
      })

      if (error) {
        setFormError(error.message ?? "Could not sign in")
        return
      }

      void navigate({ href: afterAuthPath })
    },
  })

  const signInWithGoogle = async () => {
    setFormError(null)
    setGooglePending(true)
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: afterAuthPath,
      })
      if (error) {
        setFormError(error.message ?? "Could not sign in with Google")
        setGooglePending(false)
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not sign in with Google"
      )
      setGooglePending(false)
    }
  }

  return (
    <AuthCard>
      <AuthBody>
        <AuthHeader
          title="Sign in"
          description="Welcome back! Please sign in to continue."
        />

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 w-full justify-center gap-2"
          disabled={googlePending}
          onClick={() => void signInWithGoogle()}
        >
          {googlePending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <GoogleIcon />
          )}
          {googlePending ? "Redirecting…" : "Continue with Google"}
        </Button>

        <AuthDivider />

        <form
          id="sign-in-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
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
                    <FieldLabel htmlFor={field.name}>Email address</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      autoComplete="email"
                      placeholder="alex@acme.com"
                      className="h-10"
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

            <form.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <InputGroup className="h-10">
                      <InputGroupInput
                        id={field.name}
                        name={field.name}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <IconEyeOff /> : <IconEye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
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

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              form="sign-in-form"
              size="lg"
              className="h-10 w-full"
              disabled={isSubmitting || googlePending}
            >
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              {isSubmitting ? "Signing in…" : "Continue"}
              {isSubmitting ? null : <IconArrowRight data-icon="inline-end" />}
            </Button>
          )}
        </form.Subscribe>
      </AuthBody>

      <AuthFooter>
        Don&apos;t have an account?{" "}
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 font-medium"
          render={
            <Link
              to="/sign-up"
              search={{
                redirect: redirectTo === "/select-org" ? undefined : redirectTo,
              }}
            />
          }
          nativeButton={false}
        >
          Sign up
        </Button>
      </AuthFooter>
    </AuthCard>
  )
}
