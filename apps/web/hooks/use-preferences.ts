import * as React from "react"
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
  type UserPreferences,
} from "@/lib/preferences"

export function usePreferences() {
  const [preferences, setPreferencesState] =
    React.useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setPreferencesState(readPreferences())
    setReady(true)
  }, [])

  React.useEffect(() => {
    if (!ready) return

    function onStorage(event: StorageEvent) {
      if (event.key !== PREFERENCES_STORAGE_KEY) return
      setPreferencesState(readPreferences())
    }

    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [ready])

  const setPreferences = React.useCallback(
    (updater: (current: UserPreferences) => UserPreferences) => {
      setPreferencesState((current) => {
        const next = updater(current)
        writePreferences(next)
        return next
      })
    },
    []
  )

  const updatePreference = React.useCallback(
    <TKey extends keyof UserPreferences>(
      key: TKey,
      value: UserPreferences[TKey]
    ) => {
      setPreferences((current) => ({ ...current, [key]: value }))
    },
    [setPreferences]
  )

  return { preferences, ready, updatePreference, setPreferences }
}
