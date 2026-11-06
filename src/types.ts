/** A seller agent profile as returned by the Routex402 API. */
export interface Agent {
  /** Seller profile PDA address. */
  pubkey: string;
  /** Seller's payout wallet. */
  authority: string;
  /** Service price in token base units. */
  price: number;
  /** Reputation score, 0 to 100. */
  reputationScore: number;
  /** Number of completed (successful) payments. */
  completedCount: number;
  /** Number of failed payments. */
  failedCount: number;
  /** Total paid in token base units. */
  totalVolume: number;
  /** Number of distinct buyer wallets. May be 0 for older agents. */
  distinctBuyers: number;
  /** Unix seconds of last update. */
  lastUpdated: number;
}

export type Tier = "Elite" | "Trusted" | "New";
export type Confidence = "High" | "Medium" | "Low" | "Unknown" | "Unrated";
export type CheckStatus = "pass" | "caution" | "fail" | "unknown";
export type PolicyName = "standard" | "strict" | "off";

export interface VettingCheck {
  id: "track-record" | "success-rate" | "buyer-independence" | "volume" | "recency";
  label: string;
  status: CheckStatus;
  detail: string;
}

/** Result of evaluating an agent against a policy. */
export interface Decision {
  /** proceed = allow payment; do_not_pay = block. */
  recommendation: "proceed" | "do_not_pay";
  /** Reasons the agent was blocked, if any. */
  blockReasons: string[];
  /** The policy that was applied. */
  policy: PolicyName;
}

/** Full enriched record for a single agent. */
export interface AgentReport {
  agent: Agent;
  tier: Tier;
  confidence: Confidence;
  checks: VettingCheck[];
  decision: Decision;
  evidenceUrl: string;
}
