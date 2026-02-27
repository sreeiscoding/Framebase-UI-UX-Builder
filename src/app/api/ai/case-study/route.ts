import { NextRequest } from "next/server";
import {
  requireAuth,
  requireProjectOwnership,
  jsonError,
  jsonSuccess,
} from "@/lib/auth-middleware";
import { requireActiveSubscription } from "@/lib/subscription";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { generateCaseStudy } from "@/lib/ai-service";
import { aiCaseStudySchema } from "@/lib/validators/ai";
import { logRequest } from "@/lib/request-log";

export async function POST(req: NextRequest) {
  logRequest(req);
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const subscription = await requireActiveSubscription(auth.supabase, auth.user.id);
  if (!subscription.ok) return subscription.response;

  const limit = rateLimit({
    key: buildRateLimitKey(["ai", "case-study", auth.user.id]),
    limit: 3,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return jsonError("Rate limit exceeded.", { status: 429 });
  }

  try {
    const body = aiCaseStudySchema.parse(await req.json());
    if (body.project_id) {
      const ownership = await requireProjectOwnership(
        auth.supabase,
        auth.user.id,
        body.project_id
      );
      if (!ownership.ok) return ownership.response;
    }
    const { output, usage } = await generateCaseStudy(body.project_data);

    await auth.supabase.from("ai_generations").insert({
      user_id: auth.user.id,
      project_id: body.project_id ?? null,
      generation_type: "case-study",
      input_prompt: body.project_data,
      output_reference: JSON.stringify(output),
      model_used: process.env.AI_MODEL || null,
      tokens_used: usage?.total_tokens ?? null,
    });

    return jsonSuccess({ output });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed.";
    const status = message.includes("required") ? 400 : 500;
    return jsonError(message, { status });
  }
}
