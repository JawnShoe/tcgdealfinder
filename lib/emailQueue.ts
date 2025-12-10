export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.ALERTS_EMAIL_FROM || "alerts@example.com";

export async function queueAlertEmail(payload: EmailPayload): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn(
      "[email] SENDGRID_API_KEY not configured. Email would have been:",
      payload,
    );
    return;
  }

  await fetch("https://api.sendgrid.com/v3/mail/send", {
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
    }),
  });
}
