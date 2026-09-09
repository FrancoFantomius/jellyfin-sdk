import type { HttpTransport } from './http.js';
import { JellyfinError } from './errors.js';
import type {
  QuickConnectResult,
  QuickConnectState,
  QuickConnectPollOptions
} from './types.js';

export class QuickConnectModule {
  private http: HttpTransport;

  constructor(http: HttpTransport) {
    this.http = http;
  }

  /**
   * Check whether Quick Connect is enabled on the connected Jellyfin server.
   */
  async isEnabled(): Promise<boolean> {
    try {
      const result = await this.http.request<boolean | string>('/QuickConnect/Enabled');
      if (typeof result === 'boolean') {
        return result;
      }
      return String(result).toLowerCase() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Initiate a Quick Connect authentication session.
   * Typically called by a client device (e.g. Smart TV or CLI) to generate a user-facing pairing code.
   */
  async initiate(): Promise<QuickConnectResult> {
    const result = await this.http.request<QuickConnectResult>('/QuickConnect/Initiate', {
      method: 'POST'
    });

    if (!result || !result.Code || !result.Secret) {
      throw new JellyfinError('Quick Connect initiate failed: Invalid server response.');
    }

    return result;
  }

  /**
   * Check the current authorization status of an initiated Quick Connect secret.
   *
   * @param secret The secret token returned from initiate().
   */
  async check(secret: string): Promise<QuickConnectState> {
    if (!secret) {
      throw new JellyfinError('secret is required to check Quick Connect status.');
    }

    return await this.http.request<QuickConnectState>('/QuickConnect/Connect', {
      method: 'GET',
      params: { secret }
    });
  }

  /**
   * Authorize a Quick Connect pairing code from an authenticated session.
   * Typically called on a mobile app or browser where the user is already logged in.
   *
   * @param code The pairing code shown on the target device.
   * @param userId Optional specific user ID to authenticate as (defaults to the currently authenticated user).
   */
  async authorize(code: string, userId?: string): Promise<boolean> {
    if (!code) {
      throw new JellyfinError('code is required to authorize Quick Connect.');
    }

    const params: Record<string, unknown> = {
      Code: code.replace(/\s+/g, '') // Normalize code by removing spaces
    };
    if (userId) {
      params.UserId = userId;
    }

    await this.http.request('/QuickConnect/Authorize', {
      method: 'POST',
      params
    });

    return true;
  }

  /**
   * Repeatedly poll until the user authorizes the Quick Connect request or a timeout occurs.
   *
   * @param secret The secret token returned from initiate().
   * @param options Polling configuration (intervalMs, timeoutMs, signal).
   */
  async poll(
    secret: string,
    options: QuickConnectPollOptions = {}
  ): Promise<QuickConnectState> {
    const { intervalMs = 2000, timeoutMs = 180000, signal } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (signal?.aborted) {
        throw new JellyfinError('Quick Connect polling was aborted.');
      }

      const state = await this.check(secret);
      if (state.Authenticated) {
        return state;
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), intervalMs);

        if (signal) {
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(new JellyfinError('Quick Connect polling was aborted.'));
            },
            { once: true }
          );
        }
      });
    }

    throw new JellyfinError(`Quick Connect timed out after ${timeoutMs}ms.`);
  }
}

