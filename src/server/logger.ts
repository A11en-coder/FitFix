export type LogContext = Record<string, unknown>;
export type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY =
  /(secret|token|authorization|cookie|password|api[_-]?key|payload|emailbody|session)/i;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map((item) => redactValue(key, item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactValue(childKey, childValue),
      ]),
    );
  }
  return value;
}

export function redactLogContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, redactValue(key, value)]),
  );
}

export function log(level: LogLevel, event: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "fitfix",
    ...redactLogContext(context),
  };
  console[level](JSON.stringify(entry));
}

export const logInfo = (event: string, context?: LogContext) => log("info", event, context);
export const logWarn = (event: string, context?: LogContext) => log("warn", event, context);
export const logError = (event: string, context?: LogContext) => log("error", event, context);
