/**
 * Swagger/OpenAPI Configuration
 * API documentation setup for StickerNest v2
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StickerNest v2 API',
      version: '2.0.0',
      description: `
StickerNest v2 Backend API documentation.

## Features
- **Canvas Management**: Create, edit, and collaborate on infinite canvases
- **Widget System**: AI-powered widget generation and management
- **Real-time Collaboration**: WebSocket-based multi-user editing
- **AI Generation**: Image, video, and widget generation via background jobs
- **Marketplace**: Share and discover community widgets

## Authentication
Most endpoints require authentication via JWT Bearer tokens.
1. Register or login to get access and refresh tokens
2. Include the access token in the Authorization header: \`Bearer <token>\`
3. Use the refresh token endpoint when the access token expires

## Rate Limiting
- Default: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes
- AI endpoints: 20 requests per 15 minutes
      `,
      contact: {
        name: 'StickerNest Support',
        email: 'support@stickernest.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.stickernest.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and user management',
      },
      {
        name: 'Canvas',
        description: 'Canvas CRUD operations',
      },
      {
        name: 'Widgets',
        description: 'Widget management within canvases',
      },
      {
        name: 'Jobs',
        description: 'Background job management for AI generation',
      },
      {
        name: 'AI',
        description: 'Direct AI generation endpoints',
      },
      {
        name: 'Upload',
        description: 'Asset upload and management',
      },
      {
        name: 'Marketplace',
        description: 'Widget marketplace operations',
      },
      {
        name: 'Events',
        description: 'Server-sent events for real-time updates',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'usr_abc123',
            },
            username: {
              type: 'string',
              example: 'johndoe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            displayName: {
              type: 'string',
              example: 'John Doe',
            },
            avatarUrl: {
              type: 'string',
              nullable: true,
              example: 'https://example.com/avatar.png',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Canvas: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'cnv_abc123',
            },
            name: {
              type: 'string',
              example: 'My Canvas',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            thumbnail: {
              type: 'string',
              nullable: true,
            },
            isPublic: {
              type: 'boolean',
              default: false,
            },
            settings: {
              type: 'object',
              additionalProperties: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Widget: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'wgt_abc123',
            },
            type: {
              type: 'string',
              example: 'sticker',
            },
            position: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
            },
            size: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            rotation: {
              type: 'number',
              default: 0,
            },
            zIndex: {
              type: 'number',
            },
            data: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        Job: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              example: 'job_abc123',
            },
            queue: {
              type: 'string',
              example: 'ai:image',
            },
            status: {
              type: 'string',
              enum: ['pending', 'active', 'completed', 'failed', 'delayed'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            error: {
              type: 'string',
              nullable: true,
            },
            result: {
              type: 'object',
              nullable: true,
            },
          },
        },
        ImageGenerationRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              description: 'Text prompt for image generation',
              example: 'A beautiful sunset over mountains',
            },
            negativePrompt: {
              type: 'string',
              description: 'What to avoid in the image',
            },
            width: {
              type: 'integer',
              default: 1024,
              minimum: 256,
              maximum: 2048,
            },
            height: {
              type: 'integer',
              default: 1024,
              minimum: 256,
              maximum: 2048,
            },
            numOutputs: {
              type: 'integer',
              default: 1,
              minimum: 1,
              maximum: 4,
            },
            provider: {
              type: 'string',
              enum: ['replicate', 'openai'],
              default: 'replicate',
            },
          },
        },
        WidgetGenerationRequest: {
          type: 'object',
          required: ['description'],
          properties: {
            description: {
              type: 'string',
              description: 'Description of the widget to generate',
              example: 'A weather widget showing current temperature',
            },
            mode: {
              type: 'string',
              enum: ['new', 'variation', 'layer'],
              default: 'new',
            },
            quality: {
              type: 'string',
              enum: ['basic', 'standard', 'advanced', 'professional'],
              default: 'standard',
            },
            style: {
              type: 'string',
              enum: ['minimal', 'polished', 'elaborate', 'glass', 'neon', 'retro'],
              default: 'polished',
            },
            provider: {
              type: 'string',
              enum: ['anthropic'],
              default: 'anthropic',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 20,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              example: 5,
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'No access token provided',
                code: 'UNAUTHORIZED',
              },
            },
          },
        },
        Forbidden: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'You do not have access to this resource',
                code: 'FORBIDDEN',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {},
              },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: 'Too many requests, please try again later',
                code: 'RATE_LIMITED',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './routes/*.ts',
    './controllers/*.ts',
    './docs/*.yaml',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
