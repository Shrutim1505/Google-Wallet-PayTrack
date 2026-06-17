import { logger } from '../utils/logger.js';

/**
 * Local text embeddings using Transformers.js (all-MiniLM-L6-v2).
 *
 * Runs entirely in-process via ONNX Runtime — no API key, no quota, no cost.
 * Produces 384-dimensional sentence embeddings suitable for cosine-similarity
 * based semantic categorization.
 *
 * The model (~90MB) is downloaded once on first use and cached on disk.
 */

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

// Lazily-loaded singleton pipeline (loading the model is expensive).
let extractorPromise: Promise<any> | null = null;
let modelReady = false;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      // Dynamic import keeps startup fast and avoids ESM/CJS issues at boot.
      const { pipeline, env } = await import('@xenova/transformers');
      // Allow remote model download (first run) + local cache afterwards.
      env.allowLocalModels = true;
      const extractor = await pipeline('feature-extraction', MODEL_ID);
      modelReady = true;
      logger.info({ message: 'Local embedding model loaded', model: MODEL_ID });
      return extractor;
    })().catch((e) => {
      extractorPromise = null; // allow retry on next call
      logger.error({ message: 'Failed to load local embedding model', error: (e as Error).message });
      throw e;
    });
  }
  return extractorPromise;
}

/** Generate a 384-d embedding for the given text. Returns null on failure. */
export async function generateLocalEmbedding(text: string): Promise<number[] | null> {
  if (!text || !text.trim()) return null;
  try {
    const extractor = await getExtractor();
    // Mean-pooled, L2-normalized sentence embedding.
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  } catch (e) {
    logger.error({ message: 'Local embedding generation failed', error: (e as Error).message });
    return null;
  }
}

/** Local embeddings are always available (no key required). */
export function isLocalEmbeddingEnabled(): boolean {
  return true;
}

export function isEmbeddingModelReady(): boolean {
  return modelReady;
}

/** Warm up the model at startup so the first request isn't slow. */
export async function warmupEmbeddingModel(): Promise<void> {
  try {
    await generateLocalEmbedding('warmup');
  } catch {
    /* non-fatal */
  }
}
