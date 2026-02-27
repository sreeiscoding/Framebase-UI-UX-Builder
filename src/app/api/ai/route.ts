import { NextRequest } from "next/server";
import { z } from "zod";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { getOpenAIClient } from "@/lib/ai";
import {
  requireAuth,
  jsonError,
} from "@/lib/auth-middleware";
import { requireActiveSubscription } from "@/lib/subscription";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { logRequest } from "@/lib/request-log";

const requestSchema = z.object({
  prompt: z.string().min(1),
  context: z.string().optional().default(""),
  project_id: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const limit = rateLimit({
    key: buildRateLimitKey(["ai", "stream", auth.user.id]),
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return jsonError("Rate limit exceeded.", { status: 429 });
  }

  const subscription = await requireActiveSubscription(auth.supabase, auth.user.id);
  if (!subscription.ok) return subscription.response;

  try {
    const body = requestSchema.parse(await req.json());
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: "You are a UI assistant. Respond clearly." },
        { role: "user", content: `${body.context}\n${body.prompt}` },
      ],
    });

    const stream = OpenAIStream(response, {
      onCompletion: async (completion) => {
        await auth.supabase.from("ai_generations").insert({
          user_id: auth.user.id,
          project_id: body.project_id ?? null,
          generation_type: "stream",
          input_prompt: body.prompt,
          output_reference: completion,
          model_used: process.env.AI_MODEL || null,
          tokens_used: completion ? completion.length : null,
        });
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed.";
    return jsonError(message, { status: 500 });
  }
}
