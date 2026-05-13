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
    { name: 'Health', description: 'Service health checks' },
  ],
};

export const openapiSpec = swaggerJSDoc({
  definition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
});
