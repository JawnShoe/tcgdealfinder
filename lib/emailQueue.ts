export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** URL for one-click unsubscribe (RFC 8058) */
  unsubscribeUrl?: string;
};

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.ALERTS_EMAIL_FROM || "alerts@example.com";

export async function queueAlertEmail(payload: EmailPayload): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn(
      "[email] SENDGRID_API_KEY not configured. Email would have been:",
      payload
    );
    return;
  }

  // Build headers for one-click unsubscribe (RFC 8058)
  // Gmail, Yahoo, and other major providers require this for bulk senders
  const headers: Record<string, string> = {};
  if (payload.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${payload.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: payload.to }],
        },
      ],
      from: { email: EMAIL_FROM },
      subject: payload.subject,
      content: [
        { type: "text/plain", value: payload.text },
        { type: "text/html", value: payload.html },
      ],
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(
      `[email] SendGrid API error: ${response.status} ${response.statusText}`,
      errorText
    );
    throw new Error(`SendGrid API error: ${response.status}`);
  }
}
