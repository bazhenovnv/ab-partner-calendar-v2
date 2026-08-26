import { request } from 'node:https';

export interface TelegramApiResult<T = unknown> {
  ok: boolean;
  status: number;
  body: string;
  json: T | null;
}

interface TelegramRequestOptions {
  timeoutMs?: number;
  attempts?: number;
}

function telegramIpFamily(): 4 | 6 {
  return process.env.TELEGRAM_IP_FAMILY === '4' ? 4 : 6;
}

function postOnce<T>(
  token: string,
  method: string,
  payload: unknown,
  timeoutMs: number,
): Promise<TelegramApiResult<T>> {
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/${method}`,
        method: 'POST',
        family: telegramIpFamily(),
        servername: 'api.telegram.org',
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        const maxBodyBytes = 1024 * 1024;

        res.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += buffer.length;
          if (total <= maxBodyBytes) chunks.push(buffer);
        });

        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          let json: T | null = null;
          try {
            json = JSON.parse(responseBody) as T;
          } catch {
            json = null;
          }

          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            body: responseBody,
            json,
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Telegram API timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.end(body);
  });
}

export async function telegramPostJson<T = unknown>(
  token: string,
  method: string,
  payload: unknown,
  options: TelegramRequestOptions = {},
): Promise<TelegramApiResult<T>> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const attempts = Math.max(1, options.attempts ?? 3);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await postOnce<T>(token, method, payload, timeoutMs);
      if (result.status < 500 || attempt === attempts) return result;
      lastError = new Error(`Telegram API HTTP ${result.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Telegram API request failed: ${String(lastError)}`);
}
