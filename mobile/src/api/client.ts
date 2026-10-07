import { apiUrl } from "./config";
import { storage } from "../auth/storage";
import type { Category, OtpChallenge, Selection, Session, User } from "../types";

type FieldError = { path: string; message: string };

export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors: FieldError[];
  attemptsRemaining: number | null;
  retryAfterSeconds: number | null;
  resendAvailableAt: string | null;
  expiresAt: string | null;
  email: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    extras?: Partial<Pick<ApiError, "fieldErrors" | "attemptsRemaining" | "retryAfterSeconds" | "resendAvailableAt" | "expiresAt" | "email">>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = extras?.fieldErrors ?? [];
    this.attemptsRemaining = extras?.attemptsRemaining ?? null;
    this.retryAfterSeconds = extras?.retryAfterSeconds ?? null;
    this.resendAvailableAt = extras?.resendAvailableAt ?? null;
    this.expiresAt = extras?.expiresAt ?? null;
    this.email = extras?.email ?? null;
  }

  field(path: string): string | null {
    return this.fieldErrors.find((error) => error.path === path)?.message ?? null;
  }
}

type Envelope<T> = { message: string; data: T };

const REQUEST_TIMEOUT_MS = 12_000;

let refreshInFlight: Promise<"ok" | "invalid" | "network"> | null = null;
let onSessionLost: (() => void) | null = null;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export function setSessionLostHandler(handler: (() => void) | null) {
  onSessionLost = handler;
}

function toApiError(status: number, payload: unknown): ApiError {
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const message =
    typeof body.message === "string"
      ? body.message
      : status === 0
        ? `We could not reach PadosiPro at ${apiUrl()}. Check that the API is running.`
        : "Something went wrong. Please try again.";
  const errors = Array.isArray(body.errors)
    ? body.errors.filter(
        (error): error is FieldError =>
          !!error &&
          typeof error === "object" &&
          typeof (error as FieldError).path === "string" &&
          typeof (error as FieldError).message === "string",
      )
    : [];
  return new ApiError(status, typeof body.code === "string" ? body.code : "REQUEST_FAILED", message, {
    fieldErrors: errors,
    attemptsRemaining: typeof body.attemptsRemaining === "number" ? body.attemptsRemaining : null,
    retryAfterSeconds: typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : null,
    resendAvailableAt: typeof body.resendAvailableAt === "string" ? body.resendAvailableAt : null,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
    email: typeof body.email === "string" ? body.email : null,
  });
}

async function refreshTokens(): Promise<"ok" | "invalid" | "network"> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await storage.getRefresh();
      if (!refreshToken) return "invalid" as const;
      try {
        const response = await fetchWithTimeout(`${apiUrl()}/api/auth/refresh`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) return "invalid" as const;
        const data = payload.data as Session;
        await storage.setSession(data.accessToken, data.refreshToken, data.user);
        return "ok" as const;
      } catch {
        return "network" as const;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; retry?: boolean } = {},
): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.auth !== false) {
    const access = await storage.getAccess();
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(`${apiUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      `We could not reach PadosiPro at ${apiUrl()}. Check that the API is running.`,
    );
  }

  const payload = await response.json().catch(() => null);
  if (
    response.status === 401 &&
    options.auth !== false &&
    options.retry !== false &&
    payload &&
    typeof payload === "object" &&
    (payload as { code?: string }).code === "UNAUTHORIZED"
  ) {
    const refreshed = await refreshTokens();
    if (refreshed === "ok") return request(path, { ...options, retry: false });
    if (refreshed === "network") {
      throw new ApiError(0, "NETWORK", `We could not reach PadosiPro at ${apiUrl()}. Check that the API is running.`);
    }
    onSessionLost?.();
    throw new ApiError(401, "UNAUTHORIZED", "Your session expired. Log in again.");
  }

  if (!response.ok || !payload || payload.success === false) {
    throw toApiError(response.status, payload);
  }

  return { message: payload.message ?? "OK", data: payload.data as T };
}

export const api = {
  register: (email: string, password: string) =>
    request<OtpChallenge>("/api/auth/register", { method: "POST", auth: false, body: { email, password } }),
  verify: (email: string, code: string) =>
    request<undefined>("/api/auth/verify-email", { method: "POST", auth: false, body: { email, code } }),
  resend: (email: string) =>
    request<OtpChallenge>("/api/auth/resend-otp", { method: "POST", auth: false, body: { email } }),
  login: (email: string, password: string) =>
    request<Session>("/api/auth/login", { method: "POST", auth: false, body: { email, password } }),
  logout: (refreshToken: string) =>
    request<undefined>("/api/auth/logout", { method: "POST", auth: false, body: { refreshToken } }),
  me: () => request<User>("/api/me"),
  saveProfile: (body: { name: string; mobile: string; address: string; businessName: string }) =>
    request<User>("/api/me/profile", { method: "PUT", body }),
  tasks: () => request<{ categories: Category[] }>("/api/tasks"),
  myTasks: () => request<Selection>("/api/me/tasks"),
  saveTasks: (taskIds: number[]) => request<Selection>("/api/me/tasks", { method: "PUT", body: { taskIds } }),
};
