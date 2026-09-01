export class ApiClientError extends Error {
  statusCode: number;
  endpoint: string;
  isNetworkError: boolean;
  isTimeout: boolean;
  userFriendlyMessage: string;

  constructor(options: {
    message: string;
    statusCode?: number;
    endpoint?: string;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    userFriendlyMessage?: string;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.statusCode = options.statusCode || 0;
    this.endpoint = options.endpoint || '';
    this.isNetworkError = options.isNetworkError || false;
    this.isTimeout = options.isTimeout || false;
    this.userFriendlyMessage =
      options.userFriendlyMessage ||
      'Live analysis is temporarily unavailable. Showing the demo dataset instead.';
  }
}

export function normalizeError(err: unknown, endpoint: string = ''): ApiClientError {
  if (err instanceof ApiClientError) {
    return err;
  }

  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ApiClientError({
      message: 'Request timed out or was aborted',
      endpoint,
      isTimeout: true,
      userFriendlyMessage: 'The request took too long. Falling back to local data.',
    });
  }

  if (err instanceof TypeError && err.message.includes('fetch')) {
    return new ApiClientError({
      message: `Failed to connect to backend at ${endpoint}: ${err.message}`,
      endpoint,
      isNetworkError: true,
      userFriendlyMessage: 'FastAPI backend is offline. Operating in Demo Fallback mode.',
    });
  }

  const msg = err instanceof Error ? err.message : String(err);
  return new ApiClientError({
    message: msg,
    endpoint,
    userFriendlyMessage: 'An unexpected error occurred. Operating in Demo Fallback mode.',
  });
}
