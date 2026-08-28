export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    options: {
      code: string;
      status: number;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiRequestError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
