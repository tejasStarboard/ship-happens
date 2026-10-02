import type { ReactNode } from "react"
import { useTheme } from "next-themes"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { usePreferences } from "@/hooks/use-preferences"
import {
  DISPLAY_NAME_OPTIONS,
  HOME_VIEW_OPTIONS,
  homeViewLabel,
  parseSelectString,
  type DisplayNameFormat,
  type HomeView,
} from "@/lib/preferences"

const THEME_OPTIONS = [
  { value: "system", label: "System preference" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"]

function PreferenceRow({
  title,
  description,
  control,
  bordered = true,
}: {
  title: string
  description: string
  control: ReactNode
  bordered?: boolean
}) {
  return (
    <div
      className={
        bordered
          ? "flex items-start justify-between gap-4 border-b px-4 py-3 last:border-b-0"
          : "flex items-start justify-between gap-4 px-4 py-3"
      }
    >
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function PreferenceSelect<T extends string>({
  value,
  label,
  options,
  onChange,
  disabled,
}: {
  value: T
  label: string
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const parsed = parseSelectString(next)
        if (parsed == null) return
        if (!options.some((option) => option.value === parsed)) return
        onChange(parsed as T)
      }}
    >
      <SelectTrigger size="sm" className="min-w-40">
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function PreferencesForm() {
  const { preferences, ready, updatePreference } = usePreferences()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const themeValue = (theme ?? "system") as ThemeValue
  const themeLabel =
    THEME_OPTIONS.find((option) => option.value === themeValue)?.label ??
    "System preference"

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          General
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <PreferenceRow
            title="Default home view"
            description="Select which view to display when launching the app."
            control={
              <PreferenceSelect
                value={preferences.defaultHomeView}
                label={homeViewLabel(preferences.defaultHomeView)}
                options={HOME_VIEW_OPTIONS}
                disabled={!ready}
                onChange={(value: HomeView) =>
                  updatePreference("defaultHomeView", value)
                }
              />
            }
          />
          <PreferenceRow
            title="Display names"
            description="Select how names are displayed in the interface."
            control={
              <PreferenceSelect
                value={preferences.displayNames}
                label={
                  DISPLAY_NAME_OPTIONS.find(
                    (option) => option.value === preferences.displayNames
                  )?.label ?? "Full name"
                }
                options={DISPLAY_NAME_OPTIONS}
                disabled={!ready}
                onChange={(value: DisplayNameFormat) =>
                  updatePreference("displayNames", value)
                }
              />
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          Interface and theme
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <PreferenceRow
            title="Interface theme"
            description="Select your interface color scheme."
            bordered={false}
            control={
              <PreferenceSelect
                value={themeValue}
                label={themeLabel}
                options={THEME_OPTIONS}
                disabled={!resolvedTheme}
                onChange={(value: ThemeValue) => setTheme(value)}
              />
            }
          />
        </div>
      </section>
    </div>
  )
}
