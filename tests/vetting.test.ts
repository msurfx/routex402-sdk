import { describe, it, expect } from "vitest";
import { confidence, tier, vettingChecks, evaluatePolicy } from "../src/index.js";
import type { Agent } from "../src/index.js";

const now = 1_762_000_000;
function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    pubkey: "AgentPDA",
    authority: "PayoutWallet",
    price: 10_000,
    reputationScore: 90,
    completedCount: 20,
    failedCount: 0,
    totalVolume: 200_000,
    distinctBuyers: 6,
    lastUpdated: now,
    ...overrides,
  };
}

describe("confidence", () => {
  it("returns Unrated when completedCount < 5", () => {
    expect(confidence(makeAgent({ completedCount: 4 }))).toBe("Unrated");
  });
  it("returns Unknown when distinctBuyers=0 and completedCount>=5", () => {
    expect(confidence(makeAgent({ distinctBuyers: 0, completedCount: 10 }))).toBe("Unknown");
  });
  it("returns High for well-diversified agents", () => {
    expect(confidence(makeAgent({ completedCount: 20, distinctBuyers: 6 }))).toBe("High");
  });
  it("returns Low for single-buyer agents", () => {
    expect(confidence(makeAgent({ completedCount: 20, distinctBuyers: 1 }))).toBe("Low");
  });
});

describe("tier", () => {
  it("Elite when completed>=15 and score>=90", () => {
    expect(tier(makeAgent({ completedCount: 20, reputationScore: 95 }))).toBe("Elite");
  });
  it("Trusted when completed>=5 and score>=70", () => {
    expect(tier(makeAgent({ completedCount: 10, reputationScore: 80 }))).toBe("Trusted");
  });
  it("New otherwise", () => {
    expect(tier(makeAgent({ completedCount: 3 }))).toBe("New");
  });
});

describe("vettingChecks", () => {
  it("returns 5 checks", () => {
    expect(vettingChecks(makeAgent(), now)).toHaveLength(5);
  });
  it("flags single-buyer with many payments as fail", () => {
    const checks = vettingChecks(makeAgent({ completedCount: 45, distinctBuyers: 1 }), now);
    expect(checks.find((c) => c.id === "buyer-independence")?.status).toBe("fail");
  });
  it("flags stale activity", () => {
    const stale = makeAgent({ lastUpdated: now - 100 * 86400 });
    expect(vettingChecks(stale, now).find((c) => c.id === "recency")?.status).toBe("fail");
  });
  it("volume check passes when total matches price × completed within 5%", () => {
    const agent = makeAgent({ price: 1_000, completedCount: 10, totalVolume: 10_100 });
    expect(vettingChecks(agent, now).find((c) => c.id === "volume")?.status).toBe("pass");
  });
});

describe("evaluatePolicy", () => {
  it("blocks single-buyer agent under standard", () => {
    const a = makeAgent({ completedCount: 45, distinctBuyers: 1 });
    const d = evaluatePolicy(a, vettingChecks(a, now), "standard");
    expect(d.recommendation).toBe("do_not_pay");
    expect(d.blockReasons.some((r) => r.includes("single buyer"))).toBe(true);
  });
  it("blocks low-reputation agent", () => {
    const a = makeAgent({ reputationScore: 50 });
    const d = evaluatePolicy(a, vettingChecks(a, now), "standard");
    expect(d.recommendation).toBe("do_not_pay");
  });
  it("allows well-vetted agent under standard", () => {
    const d = evaluatePolicy(makeAgent(), vettingChecks(makeAgent(), now), "standard");
    expect(d.recommendation).toBe("proceed");
  });
  it("blocks Unknown-confidence agent under strict but allows under standard", () => {
    const a = makeAgent({ distinctBuyers: 0, completedCount: 10 });
    const checks = vettingChecks(a, now);
    expect(evaluatePolicy(a, checks, "standard").recommendation).toBe("proceed");
    expect(evaluatePolicy(a, checks, "strict").recommendation).toBe("do_not_pay");
  });
  it("off policy always proceeds", () => {
    const a = makeAgent({ reputationScore: 10, distinctBuyers: 1, completedCount: 45 });
    expect(evaluatePolicy(a, vettingChecks(a, now), "off").recommendation).toBe("proceed");
  });
});
