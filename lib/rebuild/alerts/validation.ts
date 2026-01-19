import { z } from "zod";
import type { AlertDefinition } from "./alerts";
import { cadCurrencyCode } from "@/lib/rebuild/currency/cad";

const savedSearchSchema = z
  .object({
    type: z.literal("saved_search"),
    query: z.string().min(1),
  })
  .strict();

const priceThresholdSchema = z
  .object({
    type: z.literal("price_threshold"),
    listingId: z.string().min(1),
    maxPrice: z.number().positive(),
    currency: z.enum([cadCurrencyCode, "USD", "NATIVE"]),
  })
  .strict();

const trustThresholdSchema = z
  .object({
    type: z.literal("trust_threshold"),
    listingId: z.string().min(1),
    minConfidenceWeight: z.number().min(0).max(1),
  })
  .strict();

const alertSchema = z.discriminatedUnion("type", [
  savedSearchSchema,
  priceThresholdSchema,
  trustThresholdSchema,
]);

const evaluatePayloadSchema = z
  .object({
    alert: alertSchema,
    candidateLimit: z.number().int().min(1).max(50).optional(),
  })
  .strict();

export type AlertEvaluatePayload = {
  alert: AlertDefinition;
  candidateLimit?: number;
};

export function parseAlertEvaluatePayload(raw: unknown):
  | {
      ok: true;
      data: AlertEvaluatePayload;
    }
  | {
      ok: false;
      error: "invalid_payload";
    } {
  const result = evaluatePayloadSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: "invalid_payload" };
  }
  return { ok: true, data: result.data as AlertEvaluatePayload };
}
