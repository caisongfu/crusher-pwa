/**
 * Redis 缓存工具
 *
 * 基于 Upstash Redis 实现缓存功能，用于优化数据查询性能
 */

import { Redis } from "@upstash/redis";

// 从环境变量获取 Redis 配置
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn("⚠️  Upstash Redis 未配置，缓存功能将被禁用");
}

// 创建 Redis 客户端
const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 命名空间（用于键前缀） */
  namespace?: string;
}

/**
 * 获取缓存键
 *
 * @param key 原始键
 * @param namespace 命名空间
 * @returns 完整的缓存键
 */
function getCacheKey(key: string, namespace?: string): string {
  const ns = namespace || "crusher";
  return `${ns}:${key}`;
}

/**
 * 获取缓存值
 *
 * @param key 缓存键
 * @param options 缓存选项
 * @returns 缓存值或 null
 */
export async function get<T = any>(
  key: string,
  options?: CacheOptions
): Promise<T | null> {
  if (!redis) {
    return null;
  }

  try {
    const cacheKey = getCacheKey(key, options?.namespace);
    const value = await redis.get<string>(cacheKey);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/**
 * 设置缓存值
 *
 * @param key 缓存键
 * @param value 缓存值
 * @param options 缓存选项
 */
export async function set(
  key: string,
  value: any,
  options?: CacheOptions
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const cacheKey = getCacheKey(key, options?.namespace);
    const serialized = JSON.stringify(value);

    if (options?.ttl) {
      await redis.set(cacheKey, serialized, { ex: options.ttl });
    } else {
      await redis.set(cacheKey, serialized);
    }
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/**
 * 删除缓存
 *
 * @param key 缓存键
 * @param options 缓存选项
 */
export async function del(key: string, options?: CacheOptions): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const cacheKey = getCacheKey(key, options?.namespace);
    await redis.del(cacheKey);
  } catch (error) {
    console.error("Redis del error:", error);
  }
}

/**
 * 批量删除缓存（支持通配符）
 *
 * @param pattern 匹配模式（如 `stats:*`）
 * @param namespace 命名空间
 */
export async function delPattern(
  pattern: string,
  namespace?: string
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const cacheKey = getCacheKey(pattern, namespace);
    const keys = await redis.keys(cacheKey);

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Redis delPattern error:", error);
  }
}

/**
 * 带缓存的异步函数执行器
 *
 * @param key 缓存键
 * @param fn 获取数据的异步函数
 * @param options 缓存选项
 * @returns 数据（从缓存或函数获取）
 */
export async function cached<T = any>(
  key: string,
  fn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // 尝试从缓存获取
  const cachedValue = await get<T>(key, options);
  if (cachedValue !== null) {
    console.log(`✅ Cache hit: ${key}`);
    return cachedValue;
  }

  // 缓存未命中，执行函数获取数据
  console.log(`⏳ Cache miss: ${key}`);
  const value = await fn();

  // 存入缓存
  await set(key, value, options);

  return value;
}

/**
 * 缓存管理器
 *
 * 提供针对特定业务的缓存操作封装
 */
export class CacheManager {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  async get<T>(key: string): Promise<T | null> {
    return get<T>(key, { namespace: this.namespace });
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await set(key, value, { namespace: this.namespace, ttl });
  }

  async del(key: string): Promise<void> {
    await del(key, { namespace: this.namespace });
  }

  async delPattern(pattern: string): Promise<void> {
    await delPattern(pattern, this.namespace);
  }

  async cached<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    return cached(key, fn, { namespace: this.namespace, ttl });
  }
}

/**
 * 预定义的缓存管理器
 */
export const statsCache = new CacheManager("stats");
export const userCache = new CacheManager("user");
export const orderCache = new CacheManager("order");

export default {
  get,
  set,
  del,
  delPattern,
  cached,
  statsCache,
  userCache,
  orderCache,
};
