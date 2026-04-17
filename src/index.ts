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
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    try {
      return JSON.stringify(raw);
    } catch {
      return `Request failed with status ${status}`;
    }
  }
  return String(raw);
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
      // Provide helpful error messages for common cases
      if (response.status === 401) {
        throw new Error("Invalid API key. Visit https://orthogonal.sh to get one!");
      }
      if (response.status === 402) {
        throw new Error("Insufficient funds. Add USDC at https://orthogonal.sh");
      }
      // Check for nested error in data.error (e.g., from target API)
      const rawError = data.data?.error ?? data.error;
      const errorMessage = formatError(rawError, response.status);
      throw new Error(errorMessage);
    }

    return data as RunResponse;
  }
}

// Export types
export * from "./types";

// Default export
export default Orthogonal;
