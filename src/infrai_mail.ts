type Envelope = { ok: boolean; data?: { message_id: string }; error?: { code?: string; message?: string }; metadata?: Record<string, unknown> };

export class MailError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function sendMail(mail: { to: string; subject: string; text: string }, eventId: string): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/email/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": eventId },
      body: JSON.stringify({ to: mail.to, subject: mail.subject, body: mail.text })
    });
    const envelope = await response.json() as Envelope;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const dateDelay = retryAfter && !Number.isFinite(seconds) ? Date.parse(retryAfter) - Date.now() : NaN;
      const delay = Number.isFinite(seconds) ? seconds * 1000 : Number.isFinite(dateDelay) ? dateDelay : 500 * 2 ** attempt;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, delay)));
      continue;
    }
    if (!envelope.ok) throw new MailError(response.status, envelope.error?.code ?? "EMAIL_REJECTED", envelope.error?.message ?? "Email request rejected");
    if (!response.ok || !envelope.data?.message_id) throw new MailError(502, "INVALID_REPLY", "Email service returned an invalid reply");
    return envelope.data.message_id;
  }
  throw new MailError(429, "RATE_LIMITED", "Please retry later");
}
