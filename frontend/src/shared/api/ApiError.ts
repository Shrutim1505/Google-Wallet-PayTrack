/**
 * Typed error class for API failures.
 * Consumes backend RFC 7807 Problem Details responses.
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  traceId?: string;
  instance?: string;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly traceId?: string;
  public readonly fieldErrors?: Array<{ field: string; message: string }>;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    traceId?: string;
    fieldErrors?: Array<{ field: string; message: string }>;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.traceId = params.traceId;
    this.fieldErrors = params.fieldErrors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** True if this is a client error (4xx). */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** True if this is a server error (5xx). */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** Should this error be retried? */
  get isRetryable(): boolean {
    return this.isServerError || this.status === 408 || this.status === 429;
  }
}

/** Factory to convert any unknown error to an ApiError. */
export function toApiError(error: unknown): ApiError {
  // Already an ApiError
  if (error instanceof ApiError) return error;

  // Axios error with problem details response
  const axiosError = error as {
    response?: { status: number; data: ProblemDetails };
    message?: string;
    code?: string;
  };

  if (axiosError?.response) {
    const { status, data } = axiosError.response;
    return new ApiError({
      status,
      code: data?.code ?? `HTTP_${status}`,
      message: data?.title ?? data?.detail ?? axiosError.message ?? 'Request failed',
      traceId: data?.traceId,
      fieldErrors: data?.errors,
    });
  }

  // Network error (no response)
  if (axiosError?.code === 'ECONNABORTED') {
    return new ApiError({ status: 0, code: 'TIMEOUT', message: 'Request timed out' });
  }

  return new ApiError({
    status: 0,
    code: 'NETWORK_ERROR',
    message: axiosError?.message ?? 'Network error — please check your connection',
  });
}
