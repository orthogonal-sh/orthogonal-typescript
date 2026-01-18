# @orth/sdk

TypeScript SDK to call any API on the Orthogonal platform.

## Installation

```bash
npm install @orth/sdk
```

## Quick Start

```typescript
import Orthogonal from "@orth/sdk";

const orthogonal = new Orthogonal({
  apiKey: process.env.ORTHOGONAL_API_KEY,
});

const response = await orthogonal.run({
  api: "andi",
  path: "/api/v1/search",
  query: { q: "what is the weather today" },
});

console.log(response.data);
```

## Usage

### GET requests with query parameters

```typescript
const response = await orthogonal.run({
  api: "andi",
  path: "/api/v1/search",
  query: { q: "example" },
});
```

### POST requests with body

```typescript
const response = await orthogonal.run({
  api: "some-api",
  path: "/api/v1/generate",
  body: { prompt: "Hello world" },
});
```

### TypeScript generics

```typescript
interface SearchResult {
  results: Array<{ title: string; url: string }>;
}

const response = await orthogonal.run<SearchResult>({
  api: "andi",
  path: "/api/v1/search",
  query: { q: "example" },
});

console.log(response.data.results); // Typed!
```

## Configuration

```typescript
const orthogonal = new Orthogonal({
  apiKey: "orth_live_xxxxx",     // Required
  baseUrl: "https://api.orth.sh", // Optional
  timeout: 30000,                 // Optional (ms)
});
```

## Response

```typescript
{
  success: true,
  price: "0.01",    // USD paid
  data: { ... }     // API response
}
```

## License

MIT
