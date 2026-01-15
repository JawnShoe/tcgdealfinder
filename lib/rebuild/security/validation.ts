import { z } from "zod";

const outboundClickSchema = z
  .object({
    url: z.string().url(),
    listingId: z.string().min(1),
  })
  .strict();

export type OutboundClickPayload = z.infer<typeof outboundClickSchema>;

export function parseOutboundClickPayload(raw: unknown):
  | {
      ok: true;
      data: OutboundClickPayload;
    }
  | {
      ok: false;
      error: "invalid_payload";
    } {
  const result = outboundClickSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: "invalid_payload" };
  }
  return { ok: true, data: result.data };
}
