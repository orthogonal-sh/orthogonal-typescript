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
console.log(response.price); // e.g., "0.01"
```

## Response

### Success

```json
{
  "success": true,
  "price": "0.01",
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "price": "0",
  "error": "API not-found not found or not active"
}
```

## License

MIT
