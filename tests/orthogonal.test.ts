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

    it("should throw helpful error on 402", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: () => Promise.resolve({ error: "Insufficient funds" }),
      });

      const client = new Orthogonal({ apiKey: "test" });

      await expect(
        client.run({ api: "andi", path: "/search" })
      ).rejects.toThrow("Insufficient funds. Add USDC at https://orthogonal.sh");
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
