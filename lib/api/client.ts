const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  code: string;
  details: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "API_UNAVAILABLE",
      "The backend API is unavailable.",
      null,
    );
  }

  if (!response.ok) {
    let body: {
      error?: { code?: string; message?: string; details?: unknown };
    } | null = null;

    try {
      body = await response.json();
    } catch {
      body = null;
    }

    throw new ApiError(
      response.status,
      body?.error?.code ?? "API_REQUEST_FAILED",
      body?.error?.message ?? `Request failed with status ${response.status}.`,
      body?.error?.details ?? null,
    );
  }

  return response.json() as Promise<T>;
}
