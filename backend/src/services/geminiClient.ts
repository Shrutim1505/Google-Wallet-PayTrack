/**
 * AI client facade.
 *
 * Embeddings  → local Transformers.js (all-MiniLM-L6-v2): no key, no quota, no cost.
 * LLM (JSON/text) → Groq (Llama 3.3 70B): free tier, no credit card.
 *
 * This module keeps the original `geminiClient` interface so existing callers
 * (embedding categorization, LLM receipt understanding, insights) work unchanged.
 */
import { generateLocalEmbedding, isLocalEmbeddingEnabled } from './localEmbeddingService.js';
import { groqGenerateJSON, groqGenerateText, isGroqEnabled } from './groqClient.js';

/** Generate a sentence embedding (local, always available). */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  return generateLocalEmbedding(text);
}

/** Generate a JSON object via the LLM (Groq). Null if no LLM configured. */
export async function generateJSON<T>(prompt: string): Promise<T | null> {
  return groqGenerateJSON<T>(prompt);
}

/** Generate freeform text via the LLM (Groq). Null if no LLM configured. */
export async function generateText(prompt: string): Promise<string | null> {
  return groqGenerateText(prompt);
}

/**
 * Whether the AI layer is active. Embeddings run locally and are always
 * available, so semantic categorization always works.
 */
export function isAIEnabled(): boolean {
  return isLocalEmbeddingEnabled();
}

/** Whether LLM-backed features (receipt extraction, NL insights) are available. */
export function isLLMEnabled(): boolean {
  return isGroqEnabled();
}
