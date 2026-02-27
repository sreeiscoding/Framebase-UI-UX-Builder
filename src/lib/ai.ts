import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

let cachedClient: OpenAI | null = null;

export const getOpenAIClient = () => {
  if (cachedClient) return cachedClient;
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }
  cachedClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cachedClient;
};

export const buildSystemPrompt = (context: string) =>
  [
    "You are a product design system generator.",
    "Return valid JSON only.",
    "No markdown. No code fences.",
    `Context: ${context}`,
  ].join(" ");
