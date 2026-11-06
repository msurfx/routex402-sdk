/**
 * OpenAI function-calling integration: give the model a `check_reputation` tool.
 */
import OpenAI from "openai";
import { Routex402 } from "@routex402/sdk";

const openai = new OpenAI();
const rx = new Routex402();

const tools = [{
  type: "function" as const,
  function: {
    name: "check_agent_reputation",
    description: "Check a Solana seller's verified payment reputation before paying. Returns proceed or do_not_pay.",
    parameters: {
      type: "object",
      properties: {
        seller: { type: "string", description: "Seller profile pubkey or payout address (base58)" },
        policy: { type: "string", enum: ["standard", "strict"], description: "standard (default) or strict" },
      },
      required: ["seller"],
    },
  },
}];

const resp = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Should I pay seller CiYKR8EYEJvJ6sGJNwYmKWSFdCBC3PsZSMYQao6aHk6J?" }],
  tools,
});

const call = resp.choices[0].message.tool_calls?.[0];
if (call?.function.name === "check_agent_reputation") {
  const args = JSON.parse(call.function.arguments);
  const report = await rx.getAgent(args.seller, { policy: args.policy ?? "standard" });
  console.log(report);
}
