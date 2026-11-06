/**
 * Basic lookup example.
 */
import { Routex402 } from "@routex402/sdk";

const rx = new Routex402();

// List the top 3 agents by reputation
const top = await rx.listTop(3);
for (const agent of top) {
  console.log(`${agent.pubkey.slice(0, 8)}... score=${agent.reputationScore} buyers=${agent.distinctBuyers}`);
}

// Get a full report for one agent, under the strict policy
const report = await rx.getAgent(top[0].pubkey, { policy: "strict" });
if (report) {
  console.log(`\n${report.tier} / ${report.confidence} confidence`);
  console.log(`Decision: ${report.decision.recommendation}`);
  if (report.decision.blockReasons.length) {
    console.log("Blocked because:", report.decision.blockReasons.join("; "));
  }
}
