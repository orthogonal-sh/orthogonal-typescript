<div align="center">

# Orthogonal SDK

**Call any API on the [Orthogonal](https://orthogonal.com) platform from TypeScript — one client, one balance.**

Reach hundreds of production APIs through a single client and a single credit balance. No per-provider signups, keys, or contracts — authentication, routing, and billing are handled for you.

[![npm version](https://img.shields.io/npm/v/@orth/sdk.svg?logo=npm&color=cb3837)](https://www.npmjs.com/package/@orth/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@orth/sdk.svg?color=cb3837)](https://www.npmjs.com/package/@orth/sdk)
[![types](https://img.shields.io/npm/types/@orth/sdk.svg?logo=typescript&color=3178c6)](https://www.npmjs.com/package/@orth/sdk)
[![node](https://img.shields.io/node/v/@orth/sdk.svg?logo=node.js&color=339933)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@orth/sdk.svg?color=blue)](./LICENSE)

</div>

## Table of Contents

- [Why Orthogonal](#why-orthogonal)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Usage](#usage)
- [Error Handling](#error-handling)
- [API Reference](#api-reference)
- [TypeScript](#typescript)
- [Related](#related)
- [License](#license)

## Why Orthogonal

Orthogonal is a marketplace of production APIs behind one account and one balance:

- **One integration** — call any API on the platform through a single `run()` method.
- **Pay per use** — a single credit balance instead of juggling dozens of provider subscriptions.
- **Self-correcting errors** — failed calls carry a structured hint (expected schema, unexpected/missing fields, numeric bounds) so agents can fix and retry.
- **Fully typed** — ships with TypeScript definitions and ESM + CJS builds.

## Installation

Requires **Node.js 18+**.

```bash
npm install @orth/sdk
# or: pnpm add @orth/sdk  /  yarn add @orth/sdk
```

## Quick Start

```typescript
import Orthogonal from "@orth/sdk";

const orthogonal = new Orthogonal({
  apiKey: process.env.ORTHOGONAL_API_KEY!,
});

const res = await orthogonal.run({
  api: "tavily",
  path: "/search",
  query: { query: "latest AI news" },
});

console.log(res.data);   // the upstream API's response
console.log(res.price);  // amount charged, e.g. "0.01"
```

Get an API key from your [Orthogonal dashboard](https://orthogonal.com/dashboard).

## Authentication

Pass your key to the constructor:

```typescript
const orthogonal = new Orthogonal({ apiKey: "orth_live_your_key" });
```

Prefer reading it from the environment so keys never live in source:

```typescript
const orthogonal = new Orthogonal({ apiKey: process.env.ORTHOGONAL_API_KEY! });
```

## Usage

### GET request (query params)

```typescript
const res = await orthogonal.run({
  api: "fantastic-jobs",
  path: "/v1/active-ats",
  query: { time_frame: "1h", limit: 10 },
});
```

### POST request (JSON body)

```typescript
const res = await orthogonal.run({
  api: "some-api",
  path: "/v1/generate",
  body: { prompt: "a red bicycle" },
});
```

### Custom headers

Headers passed to the constructor are sent on every request:

```typescript
const orthogonal = new Orthogonal({
  apiKey: process.env.ORTHOGONAL_API_KEY!,
  headers: { "x-my-trace-id": "abc123" },
});
```

## Error Handling

`run()` resolves with the response on success and **throws** an `OrthogonalRunError` on any non-2xx response. The error extends `Error` (so `error.message` and `instanceof Error` work) and carries structured details:

```typescript
import Orthogonal, { OrthogonalRunError } from "@orth/sdk";

try {
  const res = await orthogonal.run({
    api: "fantastic-jobs",
    path: "/v1/active-ats",
    query: { time_frame: "1h", company: "Google" }, // wrong field name
  });
} catch (err) {
  if (err instanceof OrthogonalRunError) {
    console.error(err.message);          // human-readable summary
    console.error(err.status);           // HTTP status, e.g. 400
    console.error(err.orthogonal);       // self-correction hint (see below)
    console.error(err.responseBody);     // full parsed error body
  }
}
```

On a contract violation the `orthogonal` hint tells you exactly what to fix — for example, that `company` is an unexpected field and `organization` is the expected one, plus the endpoint's expected schema — so an agent can correct the request and retry instead of repeating a failing call.

## API Reference

### `new Orthogonal(config)`

| Option | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | **Required.** Your Orthogonal API key (`orth_live_…` / `orth_test_…`). |
| `headers` | `Record<string, string>` | Optional headers sent on every request. |

### `orthogonal.run(options)` → `Promise<RunResponse>`

| Option | Type | Description |
| --- | --- | --- |
| `api` | `string` | **Required.** The API slug (e.g. `"tavily"`). |
| `path` | `string` | **Required.** The endpoint path (e.g. `"/search"`). |
| `query` | `Record<string, unknown>` | Query parameters. |
| `body` | `Record<string, unknown>` | Request body for POST/PUT/PATCH. |

**`RunResponse`**

| Field | Type | Description |
| --- | --- | --- |
| `success` | `boolean` | Whether the call succeeded. |
| `price` | `string` | Amount charged in USD (e.g. `"0.01"`). |
| `data` | `unknown` | The upstream API's response. |

### `OrthogonalRunError`

Thrown by `run()` on a non-2xx response. Extends `Error`.

| Property | Type | Description |
| --- | --- | --- |
| `status` | `number` | HTTP status of the failed response. |
| `orthogonal` | `unknown` | Self-correction hint (expected schema, unexpected/missing fields), when present. |
| `responseBody` | `unknown` | The full parsed response body. |

## TypeScript

The package ships with type definitions and both ESM and CommonJS builds — no `@types` package needed. All options and responses (`OrthogonalConfig`, `RunOptions`, `RunResponse`) are exported.

## Related

- **[`@orth/cli`](https://www.npmjs.com/package/@orth/cli)** — the Orthogonal command-line tool for discovering and calling APIs from your terminal.

## License

[MIT](./LICENSE) © Orthogonal
