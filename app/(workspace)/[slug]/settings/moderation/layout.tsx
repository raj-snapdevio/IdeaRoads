interface Props {
  children: React.ReactNode;
}

export default function ModerationSettingsLayout({ children }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold text-foreground">Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage post approval, spam filtering, and blocked users.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
