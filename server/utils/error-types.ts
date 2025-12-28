export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: Record<string, unknown>;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} with ID '${identifier}' not found`
            : `${resource} not found`;
        super(message, 404, 'NOT_FOUND', { resource, identifier });
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 409, 'CONFLICT', details);
        this.name = 'ConflictError';
    }
}

export class RateLimitError extends AppError {
    public readonly retryAfter: number;

    constructor(retryAfter: number = 60) {
        super('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

export class ExternalServiceError extends AppError {
    constructor(service: string, originalError?: Error) {
        super(`External service '${service}' is unavailable`, 502, 'EXTERNAL_SERVICE_ERROR', {
            service,
            originalMessage: originalError?.message,
        });
        this.name = 'ExternalServiceError';
    }
}

export class UploadError extends AppError {
    constructor(message: string, statusCode: number = 400) {
        super(message, statusCode, 'UPLOAD_ERROR');
        this.name = 'UploadError';
    }
}

export class AIGenerationError extends AppError {
    constructor(message: string, provider: string, details?: Record<string, unknown>) {
        super(message, 500, 'AI_GENERATION_ERROR', { provider, ...details });
        this.name = 'AIGenerationError';
    }
}

export const ForbiddenError = AuthorizationError;
