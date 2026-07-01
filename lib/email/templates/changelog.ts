import { PRODUCT_NAME } from "@/config/platform";
import { getLabelInfo } from "@/lib/changelog/constants";
import { env } from "@/lib/env";

export function changelogEmailTemplate({
  voterName,
  voterEmail,
  entryTitle,
  entryLabel,
  entryId,
  workspaceSlug,
  workspaceName,
  bodyPreview,
  unsubscribeUrl,
}: {
  voterName: string;
  voterEmail: string;
  entryTitle: string;
  entryLabel: string;
  entryId: string;
  workspaceSlug: string;
  workspaceName: string;
  bodyPreview: string;
  unsubscribeUrl?: string | null;
}) {
  const labelInfo = getLabelInfo(entryLabel);
  const entryUrl = `${env.NEXT_PUBLIC_APP_URL}/${workspaceSlug}/changelog/${entryId}`;
  const subject = `[${workspaceName}] ${labelInfo.label}: ${entryTitle}`;
  const unsubscribeHtml = unsubscribeUrl
    ? ` <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>.`
    : "";
  const unsubscribeText = unsubscribeUrl
    ? `\n\nUnsubscribe: ${unsubscribeUrl}`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;max-width:600px;width:100%;">
      <tr><td style="padding:32px 40px 0;">
        <p style="margin:0;font-size:13px;color:#6b7280;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${workspaceName}</p>
        <h1 style="margin:12px 0 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${entryTitle}</h1>
        <p style="margin:8px 0 0;">
          <span style="display:inline-block;padding:3px 10px;border-radius:3px;font-size:12px;font-weight:600;background:${labelInfo.color}18;color:${labelInfo.color};">${labelInfo.label}</span>
        </p>
      </td></tr>
      <tr><td style="padding:24px 40px;">
        <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">A feature you voted for has shipped!</p>
        ${bodyPreview ? `<p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;border-left:3px solid #e5e7eb;padding-left:16px;">${bodyPreview}</p>` : ""}
        <a href="${entryUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Read the full update →</a>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you voted on a post in <strong>${workspaceName}</strong>. Sent by ${PRODUCT_NAME}.${unsubscribeHtml}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = `${workspaceName}: ${labelInfo.label} — ${entryTitle}

A feature you voted for has shipped!

${bodyPreview ? `${bodyPreview}\n\n` : ""}Read the full update: ${entryUrl}

You're receiving this because you voted on a post in ${workspaceName}.${unsubscribeText}`;

  return { subject, html, text };
}
