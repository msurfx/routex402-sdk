import type { Agent, AgentReport, PolicyName } from "./types.js";
import { confidence, tier, vettingChecks } from "./vetting.js";
import { evaluatePolicy } from "./policy.js";

const DEFAULT_BASE = "https://route402-seller.onrender.com";
const SOLSCAN_ACCOUNT = "https://solscan.io/account/";

export interface ClientOptions {
  /** API base URL. Defaults to the public seller endpoint. */
  baseUrl?: string;
  /** Request timeout in ms. Defaults to 70s (handles free-tier cold starts). */
  timeoutMs?: number;
  /** A custom fetch implementation (e.g. for testing). */
  fetch?: typeof fetch;
}

export interface GetAgentOptions {
  /** Policy to apply when producing a decision. Defaults to "standard". */
  policy?: PolicyName;
  /** Override "now" for deterministic testing. */
  atTime?: number;
}

/** Thrown on HTTP or network errors from the Routex402 API. */
export class Routex402Error extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "Routex402Error";
  }
}

/**
 * Routex402 client. Fetches verified payment reputation for Solana agents and
 * runs the vetting logic locally (no round-trip per decision).
 *
 * @example
 *   const rx = new Routex402();
 *   const report = await rx.getAgent("CiYKR8...", { policy: "strict" });
 *   if (report.decision.recommendation === "do_not_pay") {
 *     console.log("Blocked:", report.decision.blockReasons.join("; "));
 *   }
 */
export class Routex402 {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 70_000;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("No fetch implementation found. Pass `fetch` in options, or run on Node 18+ / browser.");
    }
  }

  /** List all sellers. */
  async listAgents(): Promise<Agent[]> {
    return this.request<Agent[]>("/agents");
  }

  /**
   * List top sellers by reputation score.
   * @param limit  Max agents to return (1-200).
   */
  async listTop(limit: number = 5): Promise<Agent[]> {
    const all = await this.listAgents();
    return all
      .slice()
      .sort((a, b) => b.reputationScore - a.reputationScore || b.completedCount - a.completedCount)
      .slice(0, Math.max(1, Math.min(200, limit)));
  }

  /**
   * Look up a seller by profile pubkey OR payout authority.
   * Returns null if no matching record is found.
   */
  async getAgent(pubkeyOrAuthority: string, opts: GetAgentOptions = {}): Promise<AgentReport | null> {
    const policy = opts.policy ?? "standard";
    const all = await this.listAgents();
    const agent = all.find((a) => a.pubkey === pubkeyOrAuthority || a.authority === pubkeyOrAuthority);
    if (!agent) return null;
    const checks = vettingChecks(agent, opts.atTime);
    const decision = evaluatePolicy(agent, checks, policy);
    return {
      agent,
      tier: tier(agent),
      confidence: confidence(agent),
      checks,
      decision,
      evidenceUrl: `${SOLSCAN_ACCOUNT}${agent.pubkey}?cluster=devnet`,
    };
  }

  /**
   * Quick yes/no check: is this seller safe to pay under the given policy?
   * Returns false for an unknown seller.
   */
  async isTrusted(pubkeyOrAuthority: string, opts: GetAgentOptions = {}): Promise<boolean> {
    const report = await this.getAgent(pubkeyOrAuthority, opts);
    return report?.decision.recommendation === "proceed";
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, { signal: ctrl.signal });
      if (!res.ok) throw new Routex402Error(`HTTP ${res.status} from ${url}`, res.status);
      return (await res.json()) as T;
    } catch (err: any) {
      if (err instanceof Routex402Error) throw err;
      if (err?.name === "AbortError") throw new Routex402Error(`Timeout after ${this.timeoutMs}ms contacting ${url}`);
      throw new Routex402Error(`Network error contacting ${url}: ${err?.message ?? err}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
