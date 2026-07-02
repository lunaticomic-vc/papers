import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function openai(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Copy .env.example to .env.local and paste your key.",
    );
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";
