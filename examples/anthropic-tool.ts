/**
 * Anthropic tool-use integration.
 */
import Anthropic from "@anthropic-ai/sdk";
import { Routex402 } from "@routex402/sdk";

const anthropic = new Anthropic();
const rx = new Routex402();

const tools = [{
  name: "check_agent_reputation",
  description: "Check a Solana seller's verified payment reputation before paying.",
  input_schema: {
    type: "object" as const,
    properties: {
      seller: { type: "string", description: "Seller pubkey or payout address" },
      policy: { type: "string", enum: ["standard", "strict"] },
    },
    required: ["seller"],
  },
}];

const resp = await anthropic.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 1024,
  tools,
  messages: [{ role: "user", content: "Should I pay CiYKR8EYEJvJ6sGJNwYmKWSFdCBC3PsZSMYQao6aHk6J?" }],
});

for (const block of resp.content) {
  if (block.type === "tool_use" && block.name === "check_agent_reputation") {
    const args = block.input as { seller: string; policy?: "standard" | "strict" };
    const report = await rx.getAgent(args.seller, { policy: args.policy ?? "standard" });
    console.log(report);
  }
}
