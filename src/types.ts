/**
 * Configuration options for the Orthogonal client
 */
export interface OrthogonalConfig {
  /** Your Orthogonal API key (starts with orth_live_ or orth_test_) */
  apiKey: string;
  /** Base URL for the API. Default: "https://api.orth.sh" */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: 30000 (30 seconds) */
  timeout?: number;
}

/**
 * Options for the run() method
 */
export interface RunOptions {
  /** The API slug (e.g., "andi", "weather-api") */
  api: string;
  /** The endpoint path (e.g., "/api/v1/search") */
  path: string;
  /** Query parameters to pass to the endpoint */
  query?: Record<string, unknown>;
  /** Request body for POST/PUT/PATCH requests */
  body?: Record<string, unknown>;
}

/**
 * Response from the run() method
 */
export interface RunResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** The price paid in USD (e.g., "0.01") */
  price: string;
  /** The response data from the target API */
  data: T;
}
