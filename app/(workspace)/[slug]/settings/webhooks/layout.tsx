interface Props {
  children: React.ReactNode;
}

export default function WebhooksSettingsLayout({ children }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-xl font-semibold text-foreground">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send real-time events to your own systems via HTTPS webhooks.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
