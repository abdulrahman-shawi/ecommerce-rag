// أداة إعادة المحاولة مع تأخير تصاعدي (exponential backoff).
// تُستخدم في الاستدعاءات الحساسة لـ Canva API لأن أعطال الشبكة عابرة غالبًا.

interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  /** يتم استدعاؤها عند كل محاولة فاشرة (لتسجيل السجلات) */
  onRetry?(attempt: number, error: unknown): void;
  /** افتراضيًا: نعيد المحاولة مع أي خطأ */
  shouldRetry?(error: unknown): boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 500, onRetry, shouldRetry = () => true } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && shouldRetry(error);
      if (!canRetry) break;
      onRetry?.(attempt, error);
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
