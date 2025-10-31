/**
 * Performance & Timeout Utilities
 *
 * Provides helpers for managing API call timeouts and performance optimization
 */

/**
 * Wrap a promise with a timeout
 * Returns the result if completed in time, or undefined if timeout exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue?: T
): Promise<T | undefined> {
  const timeoutPromise = new Promise<undefined>((resolve) => {
    setTimeout(() => resolve(undefined), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  return result !== undefined ? result : fallbackValue;
}

/**
 * Wrap a promise with timeout and error handling
 * Returns result, fallback value, or undefined on error/timeout
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  options: {
    timeoutMs?: number;
    fallbackValue?: T;
    functionName?: string;
    logErrors?: boolean;
  } = {}
): Promise<T | undefined> {
  const {
    timeoutMs = 10000, // Default 10 second timeout
    fallbackValue,
    functionName = 'API call',
    logErrors = true,
  } = options;

  const startTime = Date.now();

  try {
    const result = await withTimeout(apiCall(), timeoutMs, fallbackValue);
    const duration = Date.now() - startTime;

    if (result === undefined && logErrors) {
      console.warn(`[TIMEOUT] ${functionName} exceeded ${timeoutMs}ms (took ${duration}ms)`);
    } else if (duration > timeoutMs * 0.8) {
      console.warn(`[SLOW] ${functionName} took ${duration}ms (near timeout of ${timeoutMs}ms)`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    if (logErrors) {
      console.error(`[ERROR] ${functionName} failed after ${duration}ms:`, error instanceof Error ? error.message : error);
    }
    return fallbackValue;
  }
}

/**
 * Run multiple promises in parallel with individual timeouts
 * Returns results array with undefined for failed/timeout promises
 */
export async function parallelWithTimeouts<T>(
  promises: Array<{
    call: () => Promise<T>;
    name: string;
    timeoutMs?: number;
    fallback?: T;
  }>
): Promise<Array<T | undefined>> {
  const wrappedPromises = promises.map(({ call, name, timeoutMs, fallback }) =>
    safeApiCall(call, {
      timeoutMs,
      fallbackValue: fallback,
      functionName: name,
    })
  );

  return Promise.all(wrappedPromises);
}

/**
 * Run promises in batches with concurrency limit
 * Useful for API rate limiting
 */
export async function batchedParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    timeoutPerItem?: number;
  } = {}
): Promise<Array<R | undefined>> {
  const {
    batchSize = 5,
    delayBetweenBatches = 100,
    timeoutPerItem = 10000,
  } = options;

  const results: Array<R | undefined> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((item, index) =>
        safeApiCall(
          () => processor(item),
          {
            timeoutMs: timeoutPerItem,
            functionName: `Batch ${Math.floor(i / batchSize) + 1}, Item ${index + 1}`,
          }
        )
      )
    );

    results.push(...batchResults);

    // Delay between batches (except for last batch)
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * Retry a failed operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    timeoutMs?: number;
    functionName?: string;
  } = {}
): Promise<T | undefined> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    timeoutMs = 30000,
    functionName = 'Operation',
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        console.log(`[RETRY] ${functionName} - Attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await withTimeout(operation(), timeoutMs);

      if (result !== undefined) {
        if (attempt > 0) {
          console.log(`[RETRY-SUCCESS] ${functionName} succeeded on attempt ${attempt + 1}`);
        }
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[RETRY-FAIL] ${functionName} - Attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  console.error(`[RETRY-EXHAUSTED] ${functionName} failed after ${maxRetries + 1} attempts`);
  return undefined;
}

/**
 * Performance tracker for monitoring function execution
 */
export class PerformanceTracker {
  private startTime: number;
  private checkpoints: Array<{ name: string; time: number; duration: number }> = [];

  constructor(private operationName: string) {
    this.startTime = Date.now();
    console.log(`[PERF-START] ${operationName}`);
  }

  checkpoint(name: string): void {
    const now = Date.now();
    const duration = now - this.startTime;
    const lastCheckpoint = this.checkpoints[this.checkpoints.length - 1];
    const sinceLast = lastCheckpoint ? now - lastCheckpoint.time : duration;

    this.checkpoints.push({ name, time: now, duration });
    console.log(`[PERF-CHECKPOINT] ${this.operationName} - ${name}: ${sinceLast}ms (total: ${duration}ms)`);
  }

  finish(): void {
    const totalDuration = Date.now() - this.startTime;
    console.log(`[PERF-END] ${this.operationName} completed in ${totalDuration}ms`);

    // Log slowest checkpoints
    const sortedCheckpoints = [...this.checkpoints].sort((a, b) => {
      const aDiff = a.duration - (this.checkpoints[this.checkpoints.indexOf(a) - 1]?.duration || 0);
      const bDiff = b.duration - (this.checkpoints[this.checkpoints.indexOf(b) - 1]?.duration || 0);
      return bDiff - aDiff;
    });

    if (sortedCheckpoints.length > 0) {
      console.log(`[PERF-SUMMARY] Top 3 slowest operations:`);
      sortedCheckpoints.slice(0, 3).forEach((cp, i) => {
        const index = this.checkpoints.indexOf(cp);
        const prevDuration = this.checkpoints[index - 1]?.duration || 0;
        const diff = cp.duration - prevDuration;
        console.log(`  ${i + 1}. ${cp.name}: ${diff}ms`);
      });
    }
  }
}

/**
 * Execute multiple operations with a global timeout
 */
export async function executeWithGlobalTimeout<T>(
  operations: Record<string, () => Promise<any>>,
  globalTimeoutMs: number
): Promise<{ results: Record<string, any>; timedOut: boolean; duration: number }> {
  const startTime = Date.now();
  const results: Record<string, any> = {};
  let timedOut = false;

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      timedOut = true;
      resolve();
    }, globalTimeoutMs);
  });

  const executionPromise = (async () => {
    for (const [key, operation] of Object.entries(operations)) {
      if (timedOut) {
        console.warn(`[GLOBAL-TIMEOUT] Skipping ${key} - global timeout reached`);
        break;
      }

      try {
        results[key] = await operation();
      } catch (error) {
        console.error(`[GLOBAL-TIMEOUT] Operation ${key} failed:`, error);
        results[key] = undefined;
      }
    }
  })();

  await Promise.race([executionPromise, timeoutPromise]);

  const duration = Date.now() - startTime;

  if (timedOut) {
    console.error(`[GLOBAL-TIMEOUT] Execution stopped after ${duration}ms (limit: ${globalTimeoutMs}ms)`);
  }

  return { results, timedOut, duration };
}

/**
 * Cache result with TTL
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: string): T | undefined {
    const cached = this.cache.get(key);

    if (!cached) {
      return undefined;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.value;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}
