import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { EmbeddingCategorizationService } from '../services/embeddingCategorizationService.js';
import { LLMReceiptService } from '../services/llmReceiptService.js';
import { ModelEvaluationService } from '../services/modelEvaluationService.js';
import { ForecastingService } from '../services/forecastingService.js';
import { AIInsightsService } from '../services/aiInsightsService.js';
import { isAIEnabled, isLLMEnabled } from '../services/geminiClient.js';
import { isEmbeddingModelReady } from '../services/localEmbeddingService.js';

const router = Router();
router.use(authMiddleware);

const embeddingService = new EmbeddingCategorizationService();
const llmReceiptService = new LLMReceiptService();
const evaluationService = new ModelEvaluationService();
const forecastingService = new ForecastingService();
const insightsService = new AIInsightsService();

/** GET /api/v1/ai/status — AI feature flags */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      enabled: isAIEnabled(),
      embeddingProvider: 'local (all-MiniLM-L6-v2)',
      llmProvider: isLLMEnabled() ? 'groq (llama-3.3-70b)' : null,
      embeddingModelReady: isEmbeddingModelReady(),
      features: {
        llm: isLLMEnabled(),
        embeddings: isAIEnabled(),
        forecasting: true,
        evaluation: true,
        insights: true,
      },
    },
  });
});

/** POST /api/v1/ai/categorize — Embedding-based categorization */
router.post('/categorize', asyncHandler(async (req: Request, res: Response) => {
  const { merchant, description } = req.body;
  const result = await embeddingService.categorize(req.userId!, merchant, description);
  res.json({ success: true, data: result });
}));

/** POST /api/v1/ai/categorize/learn — Teach the model a new example */
router.post('/categorize/learn', asyncHandler(async (req: Request, res: Response) => {
  const { text, category } = req.body;
  await embeddingService.learnExample(req.userId!, text, category);
  res.json({ success: true, message: 'Example learned' });
}));

/** POST /api/v1/ai/receipt/extract — LLM receipt understanding */
router.post('/receipt/extract', asyncHandler(async (req: Request, res: Response) => {
  const { ocrText } = req.body;
  const result = await llmReceiptService.extractFromOCR(ocrText);
  res.json({ success: true, data: result });
}));

/** POST /api/v1/ai/evaluate — Run model evaluation */
router.post('/evaluate', asyncHandler(async (req: Request, res: Response) => {
  const modelName = req.body.modelName || 'hybrid';
  const metrics = await evaluationService.evaluate(req.userId!, modelName);
  res.json({ success: true, data: metrics });
}));

/** GET /api/v1/ai/evaluate/history — Get evaluation history */
router.get('/evaluate/history', asyncHandler(async (req: Request, res: Response) => {
  const history = await evaluationService.getHistory(req.userId!);
  res.json({ success: true, data: history });
}));

/** GET /api/v1/ai/forecast — Spending forecast */
router.get('/forecast', asyncHandler(async (req: Request, res: Response) => {
  const forecast = await forecastingService.forecast(req.userId!);
  res.json({ success: true, data: forecast });
}));

/** GET /api/v1/ai/insights — AI-generated insights */
router.get('/insights', asyncHandler(async (req: Request, res: Response) => {
  const insights = await insightsService.getRecentInsights(req.userId!);
  res.json({ success: true, data: insights });
}));

/** POST /api/v1/ai/insights/generate — Generate fresh insights */
router.post('/insights/generate', asyncHandler(async (req: Request, res: Response) => {
  const insights = await insightsService.generateInsights(req.userId!);
  res.json({ success: true, data: insights });
}));

export default router;
