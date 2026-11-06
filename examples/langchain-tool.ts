/**
 * LangChain tool integration.
 */
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { Routex402 } from "@routex402/sdk";

const rx = new Routex402();

export const routex402Tool = new DynamicStructuredTool({
  name: "check_agent_reputation",
  description: "Check a Solana seller's verified payment reputation before paying.",
  schema: z.object({
    seller: z.string().describe("Seller profile pubkey or payout address"),
    policy: z.enum(["standard", "strict"]).optional().default("standard"),
  }),
  func: async ({ seller, policy }) => {
    const report = await rx.getAgent(seller, { policy });
    return report ? JSON.stringify(report) : JSON.stringify({ found: false, recommendation: "do_not_pay" });
  },
});
