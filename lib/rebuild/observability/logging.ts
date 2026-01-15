/**
 * Rebuild observability logging - re-exports from shared module.
 *
 * This module exists for backwards compatibility with rebuild surfaces.
 * New code should import directly from @/lib/observability/logging.
 */
export {
  type LogLevel,
  type RequestLogFields,
  type JobLogFields,
  logRequest,
  logJob,
  getRequestIdFromHeaders,
  createJobLogger,
} from "@/lib/observability/logging";
