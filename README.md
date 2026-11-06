# @routex402/sdk

TypeScript SDK for **Routex402** — verified payment reputation for AI agents on Solana. Read-only reputation lookups, vetting checks, and policy decisions. Works in Node 18+, Deno, Bun, and browsers.

> **Status:** Solana **devnet** only. Scores are evidence, not a guarantee. See [routex402.xyz](https://routex402.xyz).

## Why

A seller agent's reputation score only changes when a **buyer's own wallet** signs the update. A seller cannot inflate its own record. This SDK lets any agent framework check that record before it pays.

## Install

```bash
npm install @routex402/sdk
```

## Quickstart

```ts
import { Routex402 } from "@routex402/sdk";

const rx = new Routex402();

// Look up a seller
const report = await rx.getAgent("CiYKR8EYEJvJ6sGJNwYmKWSFdCBC3PsZSMYQao6aHk6J");
if (report?.decision.recommendation === "do_not_pay") {
  console.log("Blocked:", report.decision.blockReasons.join("; "));
}

// Quick yes/no
if (await rx.isTrusted("CiYKR8...", { policy: "strict" })) {
  // ... proceed with payment
}
```

## API

### `new Routex402(options?)`

| Option      | Type              | Default                                      |
|-------------|-------------------|----------------------------------------------|
| `baseUrl`   | `string`          | `https://route402-seller.onrender.com`       |
| `timeoutMs` | `number`          | `70000` (handles free-tier cold starts)      |
| `fetch`     | `typeof fetch`    | `globalThis.fetch`                           |

### `getAgent(pubkeyOrAuthority, { policy?, atTime? })`

Returns an `AgentReport` with the score, tier, confidence, five vetting checks, and a policy decision. Returns `null` if the seller isn't registered.

### `listTop(limit?)`

Returns agents sorted by reputation score, highest first. Default limit 5.

### `isTrusted(pubkeyOrAuthority, { policy? })`

Boolean convenience over `getAgent`. Returns `false` for unknown sellers.

### Policies

- **`standard`** — reputation ≥ 80 AND buyer independence must not fail.
- **`strict`** — standard + confidence must be Medium or High.
- **`off`** — always proceed. For testing only.

### Standalone helpers

The vetting logic is also exported so you can run it on cached data:

```ts
import { confidence, tier, vettingChecks, evaluatePolicy } from "@routex402/sdk";
```

## Vetting model

Five checks, each returning pass / caution / fail / unknown:

| Check               | Pass                                                | Fail                                  |
|---------------------|-----------------------------------------------------|---------------------------------------|
| Track record        | ≥15 completed payments                              | <5                                    |
| Success rate        | ≥95%                                                | <80%                                  |
| Buyer independence  | ≥5 distinct buyers                                  | 1 buyer with ≥10 payments             |
| Volume consistency  | Total ≈ price × payments (within 5%)                | n/a (worst case: caution)             |
| Recent activity     | Within 7 days                                       | Over 30 days                          |

**Confidence**: High / Medium / Low / Unknown / Unrated. Based on distinct buyer count and payment volume.

**Tier**: Elite (≥15 payments, ≥90 score) / Trusted (≥5, ≥70) / New.

## Framework examples

See `examples/` for:
- OpenAI function-calling
- Anthropic tool use
- LangChain `DynamicStructuredTool`

## Limits today

- Devnet only, limited demo agents.
- No pagination on `/agents` yet.
- The contract has not had an external audit.
- The tool shape is a proposal, not a frozen API.

## License

MIT
