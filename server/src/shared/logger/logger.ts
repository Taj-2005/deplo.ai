import winston from "winston";
import { env } from "../../config/env";

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${String(ts)} ${level}: ${String(message)}${String(stack ?? "")}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

// Production logs go to stdout — Render/Docker capture them in the dashboard.
// File rotation requires a writable logs/ dir; the container runs as non-root `node`.
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  }),
];

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports,
  exitOnError: false,
});
