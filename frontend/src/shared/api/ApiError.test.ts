/**
 * Tests for the ApiError class and its `toApiError` factory — used across
 * every feature hook to surface backend problems to the UI.
 */
import { describe, expect, it } from 'vitest';

import { ApiError, toApiError } from './ApiError';

describe('ApiError', () => {
  it('marks 4xx as client errors and not retryable', () => {
    const err = new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'nope' });
    expect(err.isClientError).toBe(true);
    expect(err.isServerError).toBe(false);
    expect(err.isRetryable).toBe(false);
  });

  it('marks 5xx as server errors and retryable', () => {
    const err = new ApiError({ status: 500, code: 'INTERNAL', message: 'boom' });
    expect(err.isClientError).toBe(false);
    expect(err.isServerError).toBe(true);
    expect(err.isRetryable).toBe(true);
  });

  it('429 and 408 are also retryable client errors', () => {
    const tooMany = new ApiError({ status: 429, code: 'RATE_LIMIT', message: 'slow' });
    expect(tooMany.isRetryable).toBe(true);

    const timeout = new ApiError({ status: 408, code: 'TIMEOUT', message: 'late' });
    expect(timeout.isRetryable).toBe(true);
  });
});

describe('toApiError', () => {
  it('passes through an existing ApiError unchanged', () => {
    const original = new ApiError({ status: 422, code: 'VALIDATION', message: 'bad' });
    expect(toApiError(original)).toBe(original);
  });

  it('maps an axios-style error with problem details', () => {
    const axiosErr = {
      response: {
        status: 409,
        data: {
          type: 'urn:problem:conflict',
          title: 'Email already registered',
          status: 409,
          code: 'CONFLICT',
          traceId: 'abc-123',
          errors: [{ field: 'email', message: 'taken' }],
        },
      },
      message: 'Request failed with status code 409',
    };

    const err = toApiError(axiosErr);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Email already registered');
    expect(err.traceId).toBe('abc-123');
    expect(err.fieldErrors).toEqual([{ field: 'email', message: 'taken' }]);
  });

  it('falls back to message when no title or detail', () => {
    const err = toApiError({
      response: { status: 500, data: {} },
      message: 'Network Error',
    });
    expect(err.message).toBe('Network Error');
    expect(err.code).toBe('HTTP_500');
  });

  it('handles axios timeouts', () => {
    const err = toApiError({ code: 'ECONNABORTED', message: 'timeout' });
    expect(err.status).toBe(0);
    expect(err.code).toBe('TIMEOUT');
  });

  it('handles totally unknown errors', () => {
    const err = toApiError(undefined);
    expect(err.status).toBe(0);
    expect(err.code).toBe('NETWORK_ERROR');
  });
});
