import { SettingsTabs } from "./_components/settings-tabs";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function MembersSettingsLayout({
  children,
  params,
}: Props) {
  const { slug } = await params;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold text-foreground">Team Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage workspace membership and invitations.
        </p>
      </div>
      <SettingsTabs slug={slug} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
