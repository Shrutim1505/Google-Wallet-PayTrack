import swaggerJSDoc from 'swagger-jsdoc';

const definition = {
  openapi: '3.1.0',
  info: {
    title: 'PayTrack API',
    version: '1.0.0',
    description: 'Smart receipt management and personal finance tracking API',
    contact: { name: 'PayTrack Team', url: 'https://github.com/Shrutim1505/Google-Wallet-PayTrack' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:5000/api/v1', description: 'Local development' },
    { url: 'https://api.paytrack.dev/api/v1', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ProblemDetails: {
        type: 'object',
        properties: {
          type: { type: 'string', format: 'uri' },
          title: { type: 'string' },
          status: { type: 'integer' },
          detail: { type: 'string' },
          code: { type: 'string' },
          traceId: { type: 'string' },
          instance: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          permissions: { type: 'array', items: { type: 'string' } },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
      Receipt: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          merchant: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string', format: 'date' },
          category: { type: 'string' },
          items: { type: 'array' },
          notes: { type: 'string' },
          imageUrl: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
      },
      ValidationError: {
        description: 'Validation error',
        content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Receipts', description: 'Receipt CRUD operations' },
    { name: 'Budgets', description: 'Budget management' },
    { name: 'Analytics', description: 'Spending analytics' },
    { name: 'Settings', description: 'User settings' },
    { name: 'AI', description: 'AI/ML: LLM receipt understanding, embedding categorization, forecasting, model evaluation, insights' },
    { name: 'Health', description: 'Service health checks' },
  ],
  paths: {
    '/ai-enhanced/status': {
      get: {
        tags: ['AI'], summary: 'AI feature flags',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'AI feature availability (llm, embeddings, forecasting, evaluation, insights)' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/categorize': {
      post: {
        tags: ['AI'], summary: 'Embedding-based categorization with Naive Bayes + rule-based fallback',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { merchant: { type: 'string' }, description: { type: 'string' } }, required: ['merchant'] } } } },
        responses: { 200: { description: 'Predicted category with confidence, modelSource, and per-category scores' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/categorize/learn': {
      post: {
        tags: ['AI'], summary: 'Teach the model a labeled example (incremental training)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, category: { type: 'string' } }, required: ['text', 'category'] } } } },
        responses: { 200: { description: 'Example learned' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/receipt/extract': {
      post: {
        tags: ['AI'], summary: 'LLM structured extraction from OCR text (Gemini)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { ocrText: { type: 'string' } }, required: ['ocrText'] } } } },
        responses: { 200: { description: 'Structured receipt JSON (merchant, total, tax, items, paymentMethod, confidence) or null if AI disabled' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/evaluate': {
      post: {
        tags: ['AI'], summary: 'Run model evaluation (precision, recall, F1, accuracy, confusion matrix)',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { modelName: { type: 'string' } } } } } },
        responses: { 200: { description: 'Evaluation metrics with confusion matrix' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/evaluate/history': {
      get: {
        tags: ['AI'], summary: 'Historical model evaluation metrics',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of past evaluations' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/forecast': {
      get: {
        tags: ['AI'], summary: '7-day and 30-day spending forecast (exponential smoothing + confidence intervals)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Forecast with next7Days, next30Days, trend, MAPE, dailyAverage' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/insights': {
      get: {
        tags: ['AI'], summary: 'Recent AI-generated insights',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of insights (anomalies, category growth, budget risk, NL summaries)' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/ai-enhanced/insights/generate': {
      post: {
        tags: ['AI'], summary: 'Generate fresh AI insights',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Newly generated insights' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/receipts/{id}/ai': {
      get: {
        tags: ['AI'], summary: 'AI metadata for a receipt (LLM extraction, OCR comparison, model source, discrepancies)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'AI metadata or null' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/receipts/{id}/correct-category': {
      post: {
        tags: ['AI'], summary: 'Correct a receipt category and retrain Naive Bayes + embedding models',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { category: { type: 'string' } }, required: ['category'] } } } },
        responses: { 200: { description: 'Updated receipt; models retrained' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/analytics/charts': {
      get: {
        tags: ['Analytics'], summary: 'Aggregated chart data (top merchants, top categories, monthly trend, AI confidence distribution)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Chart datasets for the analytics dashboard' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
  },
};

export const openapiSpec = swaggerJSDoc({
  definition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
});
