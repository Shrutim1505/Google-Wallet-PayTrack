import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

/**
 * Groq LLM client — OpenAI-compatible chat completions API.
 *
 * Free tier, no credit card required (get a key at https://console.groq.com/keys).
 * Uses Llama 3.3 70B Versatile for high-quality structured extraction and
 * natural-language insight generation.
 */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export function isGroqEnabled(): boolean {
  return !!environment.GROQ_API_KEY;
}

async function groqChat(
  messages: Array<{ role: string; content: string }>,
  opts: { json?: boolean; temperature?: number } = {}
): Promise<string | null> {
  if (!environment.GROQ_API_KEY) return null;
  try {
    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: opts.temperature ?? 0.1,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ message: 'Groq API error', status: response.status, body: errText.slice(0, 200) });
      return null;
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    logger.error({ message: 'Groq request failed', error: (e as Error).message });
    return null;
  }
}

/** Generate a JSON object from a prompt. Returns parsed object or null. */
export async function groqGenerateJSON<T>(prompt: string): Promise<T | null> {
  const content = await groqChat(
    [
      { role: 'system', content: 'You are a precise data-extraction assistant. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    { json: true }
  );
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch (e) {
    logger.error({ message: 'Groq JSON parse failed', error: (e as Error).message });
    return null;
  }
}

/** Generate freeform text from a prompt. */
export async function groqGenerateText(prompt: string): Promise<string | null> {
  return groqChat([{ role: 'user', content: prompt }], { temperature: 0.4 });
}
