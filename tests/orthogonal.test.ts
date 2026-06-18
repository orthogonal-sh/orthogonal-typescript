import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Orthogonal from "../src/index";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Orthogonal", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with valid API key", () => {
      const client = new Orthogonal({ apiKey: "orth_live_test123" });
      expect(client).toBeInstanceOf(Orthogonal);
    });

    it("should throw error if API key is missing", () => {
      expect(() => new Orthogonal({ apiKey: "" })).toThrow(
        "Orthogonal API key is required"
      );
    });
  });

  describe("run()", () => {
    it("should make successful request with query params", async () => {
      const mockResponse = {
        success: true,
        price: "0.01",
        data: { results: [{ title: "Test" }] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = new Orthogonal({ apiKey: "orth_live_test123" });
      const result = await client.run({
        api: "andi",
        path: "/api/v1/search",
        query: { q: "test" },
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.orth.sh/v1/run",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            api: "andi",
            path: "/api/v1/search",
            query: { q: "test" },
            body: undefined,
          }),
        })
      );
    });

    it("should make successful request with body", async () => {
      const mockResponse = {
        success: true,
        price: "0.05",
        data: { generated: "content" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const client = new Orthogonal({ apiKey: "test" });
      const result = await client.run({
        api: "some-api",
        path: "/api/v1/generate",
        body: { prompt: "Hello" },
      });

      expect(result.success).toBe(true);
      expect(result.price).toBe("0.05");
    });

    it("should throw helpful error on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      const client = new Orthogonal({ apiKey: "bad_key" });

      await expect(
        client.run({ api: "andi", path: "/search" })
      ).rejects.toThrow("Invalid API key. Visit https://orthogonal.sh to get one!");
    });

    it("should fall back to a generic funds message on 402 with no body message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: () => Promise.resolve({}),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "andi", path: "/search" })
      ).rejects.toThrow("Insufficient funds. Add USDC at https://orthogonal.sh");
    });

    it("should surface the server's specific 402 message when present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: () =>
          Promise.resolve({
            error:
              "Daily spend limit reached for this API key. Limit: $10.00, spent today: $10.00.",
          }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "andi", path: "/search" })
      ).rejects.toThrow("Daily spend limit reached for this API key");
    });

    it("should throw error with nested data.error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            price: "0",
            data: { error: "Missing required parameter: q" },
          }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "andi", path: "/search" })
      ).rejects.toThrow("Missing required parameter: q");
    });

    it("should surface upstream object error's .message field (e.g. PDL)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            price: "0",
            data: {
              error: {
                type: ["invalid_request_error"],
                message:
                  "Does not meet minimum combination of required data points.",
              },
            },
          }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "peopledatalabs", path: "/v5/person/enrich" })
      ).rejects.toThrow(
        "Does not meet minimum combination of required data points."
      );
    });

    it("should JSON-stringify a structured error without a .message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            success: false,
            data: { error: { code: "bad_input", field: "q" } },
          }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "some-api", path: "/endpoint" })
      ).rejects.toThrow('{"code":"bad_input","field":"q"}');
    });

    it("should never throw '[object Object]' for any error shape", async () => {
      const shapes = [
        { data: { error: { a: 1, b: 2 } } },
        { error: { details: ["oops"] } },
        { data: { error: [1, 2, 3] } },
      ];

      for (const body of shapes) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve(body),
        });

        const client = new Orthogonal({ apiKey: "test" });
        await expect(
          client.run({ api: "x", path: "/y" })
        ).rejects.not.toThrow("[object Object]");
      }
    });

    it("should fall back to status message when no error field is present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ success: false }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "x", path: "/y" })
      ).rejects.toThrow("Request failed with status 503");
    });

    it("should fall through to JSON when .message is an empty string", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            data: { error: { type: "invalid_request_error", message: "" } },
          }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      // Must NOT throw `Error("")` — should surface the full payload instead.
      await expect(
        client.run({ api: "x", path: "/y" })
      ).rejects.toThrow(/invalid_request_error/);
    });

    it("should fall through to status when top-level error is an empty string", async () => {
      // Reproduces the `??` vs `||` regression: with `??`, an empty string at
      // `data.data.error` stops the chain and a nested `data.error` is ignored.
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            data: { error: "" },
            error: "upstream unavailable",
          }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "x", path: "/y" })
      ).rejects.toThrow("upstream unavailable");
    });

    it("should never throw Error(\"\") when error fields are empty strings", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ data: { error: "" }, error: "" }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "x", path: "/y" })
      ).rejects.toThrow("Request failed with status 500");
    });

    it("should include User-Agent header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, price: "0", data: {} }),
      });

      const client = new Orthogonal({ apiKey: "test" });
      await client.run({ api: "test", path: "/test" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": "@orth/sdk/0.1.0",
          }),
        })
      );
    });
  });
});
