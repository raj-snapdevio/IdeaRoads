import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { PlatformSettingsForm } from "@/components/orbit/platform-settings-form";
import { getPlatformSettings } from "@/lib/orbit/settings";

export const metadata = { title: "Platform Settings" };

export default async function PlatformSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div>
      <OrbitPageHeader
        description="Configure signup, workspace limits, and maintenance mode."
        eyebrow="Orbit"
        title="Platform Settings"
      />
      <div className="max-w-xl">
        <PlatformSettingsForm settings={settings} />
      </div>
    </div>
  );
}
