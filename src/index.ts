import { OrthogonalConfig, RunOptions, RunResponse } from "./types";

const VERSION = "0.1.0";
const BASE_URL = "https://api.orth.sh";

/**
 * Coerce an error payload into a human-readable string.
 *
 * Upstream providers surface errors as structured objects (e.g. People Data Labs
 * returns `{type: [...], message: "..."}`). Passing those to `new Error()` coerces
 * to `"[object Object]"`, which is useless to SDK consumers. We prefer the most
 * specific string field when present, and fall back to JSON so callers can still
 * see the full payload.
 */
function formatError(raw: unknown, status: number): string {
  if (raw == null) return `Request failed with status ${status}`;
  if (typeof raw === "string") {
    return raw.length > 0 ? raw : `Request failed with status ${status}`;
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // Only use .message / .error if they are non-empty strings; otherwise fall
    // through to JSON.stringify so callers still see the full payload.
    if (typeof obj.message === "string" && obj.message.length > 0) return obj.message;
    if (typeof obj.error === "string" && obj.error.length > 0) return obj.error;
    try {
      const json = JSON.stringify(raw);
      // "{}" / "[]" / "null" aren't useful; fall back to the status message.
      if (json && json !== "{}" && json !== "[]" && json !== "null") return json;
      return `Request failed with status ${status}`;
    } catch {
      return `Request failed with status ${status}`;
    }
  }
  return String(raw);
}

/**
 * Error thrown by {@link Orthogonal.run} on a non-2xx response.
 *
 * Extends `Error` (so existing `catch (e) { e.message }` keeps working) but also
 * carries the structured server payload. On a contract violation the API returns
 * an `_orthogonal` self-correction hint (expected schema, unexpected/missing
 * fields, numeric bounds) — exposed here as `orthogonal` so an agent can fix the
 * request and retry instead of only seeing the terse message.
 */
export class OrthogonalRunError extends Error {
  /** HTTP status of the failed response. */
  status: number;
  /** The API's `_orthogonal` self-correction hint, when present. */
  orthogonal?: unknown;
  /** The full parsed response body. */
  responseBody?: unknown;

  constructor(
    message: string,
    opts: { status: number; orthogonal?: unknown; responseBody?: unknown },
  ) {
    super(message);
    this.name = "OrthogonalRunError";
    this.status = opts.status;
    this.orthogonal = opts.orthogonal;
    this.responseBody = opts.responseBody;
    // Restore the prototype chain for instanceof across the compiled target.
    Object.setPrototypeOf(this, OrthogonalRunError.prototype);
  }
}

/**
 * Orthogonal SDK client
 *
 * @example
 * ```typescript
 * import Orthogonal from "@orth/sdk";
 *
 * const orthogonal = new Orthogonal({
 *   apiKey: process.env.ORTHOGONAL_API_KEY
 * });
 *
 * const response = await orthogonal.run({
 *   api: "andi",
 *   path: "/api/v1/search",
 *   query: { q: "hello world" }
 * });
 *
 * console.log(response.data);
 * ```
 */
export class Orthogonal {
  private apiKey: string;
  private customHeaders: Record<string, string>;

  constructor(config: OrthogonalConfig) {
    if (!config.apiKey) {
      throw new Error("Orthogonal API key is required");
    }
    this.apiKey = config.apiKey;
    this.customHeaders = config.headers || {};
  }

  /**
   * Call any API on the Orthogonal platform
   */
  async run(options: RunOptions): Promise<RunResponse> {
    const { api, path, query, body } = options;

    const response = await fetch(`${BASE_URL}/v1/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": `@orth/sdk/${VERSION}`,
        "X-Orthogonal-Source": "sdk",
        ...this.customHeaders,
      },
      body: JSON.stringify({ api, path, query, body }),
    });

    const data = await response.json();

    if (!response.ok) {
      const orthogonal = (data as any)?._orthogonal;
      // Provide helpful error messages for common cases
      if (response.status === 401) {
        throw new OrthogonalRunError(
          "Invalid API key. Visit https://orthogonal.com to get one!",
          { status: 401, orthogonal, responseBody: data },
        );
      }
      if (response.status === 402) {
        // 402 now covers several distinct cases: insufficient credits, a per-key
        // daily spend limit, and an account-wide daily spend limit. Surface the
        // server's specific message when it provided one so callers know which
        // applies. We test `rawError` directly (not formatError's output) so a
        // real message that happens to start with "Request failed" isn't mistaken
        // for the no-message fallback.
        const rawError = data.data?.error || data.error;
        const hasServerMessage =
          rawError !== undefined && rawError !== null && rawError !== "";
        throw new OrthogonalRunError(
          hasServerMessage
            ? formatError(rawError, response.status)
            : "Insufficient credits. Top up your balance at https://www.orthogonal.com/dashboard/balance",
          { status: 402, orthogonal, responseBody: data },
        );
      }
      // Check for nested error in data.error (e.g., from target API). Use `||`
      // (not `??`) so that falsy values like `""` still fall through the chain
      // to the status-based fallback inside `formatError`.
      const rawError = data.data?.error || data.error;
      const errorMessage = formatError(rawError, response.status);
      throw new OrthogonalRunError(errorMessage, {
        status: response.status,
        orthogonal,
        responseBody: data,
      });
    }

    return data as RunResponse;
  }
}

// Export types
export * from "./types";

// Default export
export default Orthogonal;
