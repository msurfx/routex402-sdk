import type { Agent, Confidence, Tier, VettingCheck } from "./types.js";

/** Current time in Unix seconds. */
const nowSec = () => Math.floor(Date.now() / 1000);

/** Compute a seller's confidence level from its distinct buyer count and payments. */
export function confidence(agent: Agent): Confidence {
  const c = agent.completedCount;
  const b = agent.distinctBuyers;
  if (c < 5) return "Unrated";
  if (b === 0) return "Unknown";
  if (c >= 15 && b >= 5) return "High";
  if (c >= 5 && b >= 2) return "Medium";
  return "Low";
}

/** Tier assignment: Elite, Trusted, or New. */
export function tier(agent: Agent): Tier {
  if (agent.completedCount >= 15 && agent.reputationScore >= 90) return "Elite";
  if (agent.completedCount >= 5 && agent.reputationScore >= 70) return "Trusted";
  return "New";
}

/**
 * Run the five vetting checks on an agent.
 * Pass a fixed `atTime` (Unix seconds) to make it deterministic for tests.
 */
export function vettingChecks(agent: Agent, atTime: number = nowSec()): VettingCheck[] {
  const { completedCount: c, failedCount: f, distinctBuyers: b, lastUpdated, price, totalVolume } = agent;
  const total = c + f;
  const rate = total === 0 ? 0 : (c / total) * 100;
  const ageDays = (atTime - lastUpdated) / 86400;
  const checks: VettingCheck[] = [];

  checks.push({
    id: "track-record",
    label: "Track record",
    status: c >= 15 ? "pass" : c >= 5 ? "caution" : "fail",
    detail: `${c} completed payments${c < 5 ? " (not enough history to rate)" : ""}`,
  });

  checks.push({
    id: "success-rate",
    label: "Success rate",
    status: total === 0 ? "unknown" : rate >= 95 ? "pass" : rate >= 80 ? "caution" : "fail",
    detail: total === 0 ? "No payments recorded yet" : `${rate.toFixed(1)}% (${c} ok, ${f} failed)`,
  });

  let bStatus: VettingCheck["status"]; let bDetail: string;
  if (c > 0 && b === 0) { bStatus = "unknown"; bDetail = "Distinct buyer count not recorded for this agent"; }
  else if (b >= 5)       { bStatus = "pass"; bDetail = `${b} distinct buyers`; }
  else if (b >= 2)       { bStatus = "caution"; bDetail = `Only ${b} distinct buyers`; }
  else if (b === 1 && c >= 10) { bStatus = "fail"; bDetail = `${c} payments from a single buyer`; }
  else                   { bStatus = "unknown"; bDetail = "Too little history to judge"; }
  checks.push({ id: "buyer-independence", label: "Buyer independence", status: bStatus, detail: bDetail });

  if (price === 0 || c === 0) {
    checks.push({ id: "volume", label: "Volume consistency", status: "unknown", detail: "Not enough data to compare" });
  } else {
    const expected = price * c;
    const drift = Math.abs(totalVolume - expected) / expected;
    checks.push({
      id: "volume", label: "Volume consistency",
      status: drift <= 0.05 ? "pass" : "caution",
      detail: `Volume is within ${(drift * 100).toFixed(1)}% of price × payments`,
    });
  }

  checks.push({
    id: "recency", label: "Recent activity",
    status: ageDays <= 7 ? "pass" : ageDays <= 30 ? "caution" : "fail",
    detail: `Last update ${Math.floor(ageDays)} days ago`,
  });

  return checks;
}
