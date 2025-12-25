/**
 * Exponential backoff retry utility for rate-limited requests.
 *
 * Retries on 429 (Too Many Requests) responses with exponential backoff.
 * Does NOT retry on other error status codes.
 */

export type RetryOptions = {
  maxRetries?: number; // Default: 3
  baseDelayMs?: number; // Default: 1000 (1 second)
  maxDelayMs?: number; // Default: 30000 (30 seconds)
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30000;

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function getBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter: +/- 20%
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  return Math.max(0, delay);
}

/**
 * Wraps a fetch call with exponential backoff retry on 429 responses.
 *
 * @param fetchFn - A function that performs the fetch and returns a Response
 * @param options - Retry configuration
 * @returns The Response from fetchFn (either success or non-429 error)
 */
export async function fetchWithRateLimitRetry(
  fetchFn: () => Promise<Response>,
  options?: RetryOptions
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetchFn();

    // If not rate-limited, return immediately (success or other error)
    if (response.status !== 429) {
      return response;
    }

    lastResponse = response;

    // Don't retry if we've exhausted attempts
    if (attempt >= maxRetries) {
      console.warn(
        `fetchWithRateLimitRetry: exhausted ${maxRetries} retries after 429 responses`
      );
      break;
    }

    // Check for Retry-After header
    const retryAfterHeader = response.headers.get("Retry-After");
    let delayMs: number;

    if (retryAfterHeader) {
      const retryAfterSeconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(retryAfterSeconds)) {
        // Server specified a delay
        delayMs = Math.min(retryAfterSeconds * 1000, maxDelayMs);
        console.log(
          `fetchWithRateLimitRetry: 429 received, Retry-After=${retryAfterSeconds}s, waiting ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );
      } else {
        // Fallback to exponential backoff
        delayMs = getBackoffDelay(attempt, baseDelayMs, maxDelayMs);
        console.log(
          `fetchWithRateLimitRetry: 429 received, using exponential backoff ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
        );
      }
    } else {
      // No Retry-After header, use exponential backoff
      delayMs = getBackoffDelay(attempt, baseDelayMs, maxDelayMs);
      console.log(
        `fetchWithRateLimitRetry: 429 received, using exponential backoff ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
    }

    await sleep(delayMs);
  }

  // Return the last 429 response if all retries exhausted
  return lastResponse!;
}
