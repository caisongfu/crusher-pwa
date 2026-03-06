/**
 * 日志工具
 *
 * 统一的日志格式，支持请求 ID 追踪和用户 ID
 */

import { randomUUID } from 'crypto';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日志上下文
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

/**
 * 格式化日志消息
 *
 * @param level 日志级别
 * @param message 日志消息
 * @param context 日志上下文
 * @returns 格式化后的日志字符串
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const requestId = context?.requestId || 'N/A';
  const userId = context?.userId || 'N/A';

  const parts = [
    `[${timestamp}]`,
    `[${level}]`,
    `[req:${requestId}]`,
    `[user:${userId}]`,
    message,
  ];

  return parts.join(' ');
}

/**
 * 生成请求 ID
 *
 * @returns 唯一的请求 ID
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * 调试日志
 *
 * @param message 日志消息
 * @param context 日志上下文
 */
export function debug(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(formatLog(LogLevel.DEBUG, message, context));
  }
}

/**
 * 信息日志
 *
 * @param message 日志消息
 * @param context 日志上下文
 */
export function info(message: string, context?: LogContext): void {
  console.log(formatLog(LogLevel.INFO, message, context));
}

/**
 * �告日志
 *
 * @param message 日志消息
 * @param context 日志上下文
 */
export function warn(message: string, context?: LogContext): void {
  console.warn(formatLog(LogLevel.WARN, message, context));
}

/**
 * 错误日志
 *
 * @param message 日志消息
 * @param error 错误对象
 * @param context 日志上下文
 */
export function error(
  message: string,
  error?: Error | unknown,
  context?: LogContext
): void {
  console.error(formatLog(LogLevel.ERROR, message, context), error);
}

/**
 * 记录 API 请求
 *
 * @param method HTTP 方法
 * @param path 请求路径
 * @param context 日志上下文
 */
export function logRequest(
  method: string,
  path: string,
  context?: LogContext
): void {
  info(`${method} ${path}`, context);
}

/**
 * 记录 API 响应
 *
 * @param statusCode HTTP 状态码
 * @param durationMs 请求耗时（毫秒）
 * @param context 日志上下文
 */
export function logResponse(
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const message = `Response ${statusCode} (${durationMs}ms)`;
  const level = statusCode >= 500 ? LogLevel.ERROR : LogLevel.INFO;
  const formatted = formatLog(level, message, context);

  if (statusCode >= 500) {
    console.error(formatted);
  } else if (statusCode >= 400) {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

/**
 * 记录数据库操作
 *
 * @param operation 操作类型（select, insert, update, delete）
 * @param table 表名
 * @param context 日志上下文
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  context?: LogContext
): void {
  debug(`DB ${operation} on ${table}`, context);
}

/**
 * 记录缓存操作
 *
 * @param operation 操作类型（hit, miss, set, del）
 * @param key 缓存键
 * @param context 日志上下文
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'del',
  key: string,
  context?: LogContext
): void {
  const message = `Cache ${operation}: ${key}`;
  debug(message, context);
}

/**
 * 日志管理器
 *
 * 提供针对特定业务的日志封装
 */
export class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private formatMessage(message: string): string {
    return `[${this.prefix}] ${message}`;
  }

  debug(message: string, context?: LogContext): void {
    debug(this.formatMessage(message), context);
  }

  info(message: string, context?: LogContext): void {
    info(this.formatMessage(message), context);
  }

  warn(message: string, context?: LogContext): void {
    warn(this.formatMessage(message), context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    error(this.formatMessage(message), error, context);
  }
}

export default {
  LogLevel,
  generateRequestId,
  debug,
  info,
  warn,
  error,
  logRequest,
  logResponse,
  logDatabaseOperation,
  logCacheOperation,
  Logger,
};
