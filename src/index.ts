import { OrthogonalConfig, RunOptions, RunResponse } from "./types";

const VERSION = "0.1.0";
const BASE_URL = "https://api.orth.sh";

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

  constructor(config: OrthogonalConfig) {
    if (!config.apiKey) {
      throw new Error("Orthogonal API key is required");
    }
    this.apiKey = config.apiKey;
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
      const errorMessage = data.data?.error || data.error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as RunResponse;
  }
}

// Export types
export * from "./types";

// Default export
export default Orthogonal;
