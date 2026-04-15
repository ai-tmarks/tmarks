/**
 * 

 */
import { internalError, badRequest, unauthorized, forbidden, notFound, conflict } from './response'
export interface ErrorContext {
  userId?: string
  endpoint?: string
  method?: string
  ip?: string
  userAgent?: string
  requestId?: string
}
export interface ErrorDetails {
  code: string
  message: string
  details?: string
  field?: string
  context?: ErrorContext
}
/**

 */
export function handleError(error: unknown, context?: ErrorContext): Response {
  const errorDetails = normalizeError(error, context)
  logError(errorDetails)

  switch (errorDetails.code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
    case 'MISSING_FIELD':
      return badRequest(errorDetails.message, errorDetails.code)
    case 'UNAUTHORIZED':
    case 'INVALID_TOKEN':
    case 'TOKEN_EXPIRED':
      return unauthorized(errorDetails.message, errorDetails.code)
    case 'FORBIDDEN':
    case 'INSUFFICIENT_PERMISSIONS':
      return forbidden(errorDetails.message, errorDetails.code)
    case 'NOT_FOUND':
    case 'RESOURCE_NOT_FOUND':
      return notFound(errorDetails.message, errorDetails.code)
    case 'CONFLICT':
    case 'DUPLICATE_RESOURCE':
      return conflict(errorDetails.message, errorDetails.code)
    default:
      return internalError(errorDetails.message, errorDetails.code)
  }
}
/**

 */
function normalizeError(error: unknown, context?: ErrorContext): ErrorDetails {
  if (error instanceof Error) {

    if (error.message.includes('UNIQUE constraint failed')) {
      return {
        code: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists',
        details: error.message,
        context
      }
    }
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return {
        code: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist',
        details: error.message,
        context
      }
    }
    if (error.message.includes('no such column')) {
      return {
        code: 'DATABASE_SCHEMA_ERROR',
        message: 'Database schema mismatch',
        details: error.message,
        context
      }
    }
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      details: error.stack,
      context
    }
  }
  if (typeof error === 'string') {
    return {
      code: 'INTERNAL_ERROR',
      message: error,
      context
    }
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    details: String(error),
    context
  }
}
/**
 * 
 */
function logError(errorDetails: ErrorDetails): void {
  const logData = {
    timestamp: new Date().toISOString(),
    code: errorDetails.code,
    message: errorDetails.message,
    details: errorDetails.details,
    context: errorDetails.context
  }
  // ，
  console.error('Error occurred:', JSON.stringify(logData, null, 2))
}
/**

 */
export function createErrorContext(request: Request, userId?: string): ErrorContext {
  return {
    userId,
    endpoint: new URL(request.url).pathname,
    method: request.method,
    ip: request.headers.get('CF-Connecting-IP') || 
        request.headers.get('X-Forwarded-For') || 
        'unknown',
    userAgent: request.headers.get('User-Agent') || 'unknown',
    requestId: request.headers.get('X-Request-ID') || crypto.randomUUID()
  }
}
/**

 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext
) {
  return async (...args: T): Promise<R | Response> => {
    try {
      return await fn(...args)
    } catch (error) {
      return handleError(error, context)
    }
  }
}
