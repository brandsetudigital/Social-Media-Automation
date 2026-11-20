import { SupportedAIProvider } from '../../../config/ai.config';
import { AIProviderError } from '../interfaces/IAIService';

/**
 * Executes a promise with an enforced timeout.
 * Rejects with a formatted AIProviderError if execution exceeds the specified timeout.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: SupportedAIProvider,
  operationName: string = 'AI Generation'
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new AIProviderError({
          provider,
          code: 'TIMEOUT',
          message: `${operationName} exceeded timeout of ${timeoutMs}ms for provider "${provider}"`,
          isTimeout: true,
        })
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
