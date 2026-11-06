import type { Agent, Decision, PolicyName, VettingCheck } from "./types.js";
import { confidence } from "./vetting.js";

/**
 * Apply a trust policy. Returns a proceed/do_not_pay recommendation
 * with plain-language reasons.
 *
 * - "standard": reputation ≥ 80 and buyer independence must not fail.
 * - "strict":   standard, plus confidence must be Medium or High.
 * - "off":      always proceed. Use with care.
 */
export function evaluatePolicy(agent: Agent, checks: VettingCheck[], policy: PolicyName): Decision {
  if (policy === "off") return { recommendation: "proceed", blockReasons: [], policy };

  const reasons: string[] = [];
  if (agent.reputationScore < 80) {
    reasons.push(`Reputation ${agent.reputationScore} is below the minimum of 80`);
  }
  const buyerCheck = checks.find((c) => c.id === "buyer-independence");
  if (buyerCheck?.status === "fail") reasons.push(buyerCheck.detail);

  if (policy === "strict") {
    const conf = confidence(agent);
    if (conf !== "Medium" && conf !== "High") {
      reasons.push(`Confidence is ${conf}; strict policy needs Medium or High`);
    }
  }

  return {
    recommendation: reasons.length ? "do_not_pay" : "proceed",
    blockReasons: reasons,
    policy,
  };
}
