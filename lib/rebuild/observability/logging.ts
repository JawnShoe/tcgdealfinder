import { randomUUID } from "crypto";

export type LogLevel = "info" | "warn" | "error";

type StructuredPayload = {
  level: LogLevel;
  msg: string;
  ts: string;
  route?: string;
  requestId?: string;
  job?: string;
  jobId?: string;
  durationMs?: number;
  status?: number;
  errorName?: string;
  errorMessage?: string;
};

export type RequestLogFields = {
  level?: LogLevel;
  msg: string;
  route: string;
  requestId: string;
  durationMs?: number;
  status?: number;
  error?: unknown;
};

export type JobLogFields = {
  level?: LogLevel;
  msg: string;
  job: string;
  jobId: string;
  durationMs?: number;
  status?: number;
  error?: unknown;
};

function buildErrorFields(
  error: unknown
): Pick<StructuredPayload, "errorName" | "errorMessage"> | null {
  if (!(error instanceof Error)) {
    return null;
  }

  return {
    errorName: error.name,
    errorMessage: error.message,
  };
}

export function logRequest(fields: RequestLogFields) {
  const payload: StructuredPayload = {
    level: fields.level ?? "info",
    msg: fields.msg,
    ts: new Date().toISOString(),
    route: fields.route,
    requestId: fields.requestId,
  };

  if (fields.durationMs != null) {
    payload.durationMs = Math.round(fields.durationMs);
  }

  if (fields.status != null) {
    payload.status = fields.status;
  }

  const errorFields = buildErrorFields(fields.error);
  if (errorFields) {
    Object.assign(payload, errorFields);
  }

  console.log(JSON.stringify(payload));
}

export function logJob(fields: JobLogFields) {
  const payload: StructuredPayload = {
    level: fields.level ?? "info",
    msg: fields.msg,
    ts: new Date().toISOString(),
    job: fields.job,
    jobId: fields.jobId,
  };

  if (fields.durationMs != null) {
    payload.durationMs = Math.round(fields.durationMs);
  }

  if (fields.status != null) {
    payload.status = fields.status;
  }

  const errorFields = buildErrorFields(fields.error);
  if (errorFields) {
    Object.assign(payload, errorFields);
  }

  console.log(JSON.stringify(payload));
}

export function getRequestIdFromHeaders(headers: Pick<Headers, "get">): string {
  const requestId = headers.get("x-request-id");
  if (requestId && requestId.trim()) {
    return requestId;
  }
  return randomUUID();
}

export function createJobLogger(job: string) {
  const jobId = randomUUID();
  return {
    jobId,
    log: (fields: Omit<JobLogFields, "job" | "jobId">) =>
      logJob({
        job,
        jobId,
        ...fields,
      }),
  };
}
