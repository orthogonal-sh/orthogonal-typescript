import { OrthogonalConfig, RunOptions, RunResponse } from "./types";

const VERSION = "0.1.0";

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
  private baseUrl: string;
  private timeout: number;

  constructor(config: OrthogonalConfig) {
    if (!config.apiKey) {
      throw new Error("Orthogonal API key is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.orth.sh";
    this.timeout = config.timeout || 30000;
  }

  /**
   * Call any API on the Orthogonal platform
   */
  async run<T = unknown>(options: RunOptions): Promise<RunResponse<T>> {
    const { api, path, query, body } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/v1/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `@orth/sdk/${VERSION}`,
        },
        body: JSON.stringify({ api, path, query, body }),
        signal: controller.signal,
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
        const errorMessage = data.data?.error || data.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return data as RunResponse<T>;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export types
export * from "./types";

// Default export
export default Orthogonal;
