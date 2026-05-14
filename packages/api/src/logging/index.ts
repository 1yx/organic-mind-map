/**
 * Request ID generation and structured logging.
 *
 * All log entries are JSON lines written to stdout/stderr so they can be
 * collected by external log aggregation tools.
 */
import { randomBytes } from "node:crypto";
import { Temporal } from "temporal-polyfill";

/** Generates a URL-safe request ID prefixed with `req_`. */
export function generateRequestId(): string {
  const bytes = randomBytes(8);
  return `req_${Buffer.from(bytes).toString("base64url")}`;
}

/** Key-value context attached to every log entry. */
export type LogContext = {
  requestId?: string;
  jobId?: string;
  workerId?: string;
  artifactId?: string;
  documentId?: string;
  userId?: string;
  [key: string]: unknown;
};

/** Severity level for log entries. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured JSON log entry. */
export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
};

/**
 * Creates a structured logger that writes JSON lines.
 *
 * @param base - Default context merged into every log entry.
 */
export function createLogger(base: LogContext = {}) {
  /** @param level - Severity level. */
  function write(level: LogLevel, message: string, extra?: LogContext) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Temporal.Now.instant().toString(),
      context: { ...base, ...extra },
    };
    const stream = level === "error" ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(entry)}\n`);
  }

  return {
    debug: (msg: string, ctx?: LogContext) => write("debug", msg, ctx),
    info: (msg: string, ctx?: LogContext) => write("info", msg, ctx),
    warn: (msg: string, ctx?: LogContext) => write("warn", msg, ctx),
    error: (msg: string, ctx?: LogContext) => write("error", msg, ctx),
    child: (extra: LogContext) => createLogger({ ...base, ...extra }),
  };
}

/** Logger instance type returned by createLogger. */
export type Logger = ReturnType<typeof createLogger>;
