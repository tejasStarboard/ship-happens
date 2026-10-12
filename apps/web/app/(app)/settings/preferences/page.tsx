import { PreferencesForm } from "@/components/settings/preferences-form";

export default function SettingsPreferencesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theme and display preferences for this browser.
        </p>
      </div>
      <PreferencesForm />
    </div>
  );
}
