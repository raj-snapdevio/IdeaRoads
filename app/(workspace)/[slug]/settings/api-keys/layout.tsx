interface Props {
  children: React.ReactNode;
}

export default function ApiKeysSettingsLayout({ children }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold text-foreground">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create workspace-scoped API keys for programmatic access.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
