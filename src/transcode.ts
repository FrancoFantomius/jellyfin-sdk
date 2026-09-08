import type { HttpTransport } from './http.js';
import { JellyfinError } from './errors.js';

export class TranscodeModule {
  private http: HttpTransport;
  private getDeviceId: () => string;

  constructor(http: HttpTransport, getDeviceId: () => string) {
    this.http = http;
    this.getDeviceId = getDeviceId;
  }

  /**
   * Explicitly stop an active server transcoding session via DELETE /Videos/ActiveEncodings.
   * This terminates lingering FFmpeg processes on the Jellyfin server.
   *
   * @param playSessionId The unique playback session ID.
   * @param deviceId The client device ID (defaults to configured client device ID).
   */
  async stopActiveEncoding(playSessionId: string, deviceId?: string): Promise<void> {
    if (!playSessionId) {
      throw new JellyfinError('playSessionId is required to stop an active encoding session.');
    }

    const resolvedDeviceId = deviceId || this.getDeviceId();
    if (!resolvedDeviceId) {
      throw new JellyfinError('deviceId is required to stop an active encoding session.');
    }

    await this.http.request('/Videos/ActiveEncodings', {
      method: 'DELETE',
      params: {
        DeviceId: resolvedDeviceId,
        PlaySessionId: playSessionId
      }
    });
  }

  /**
   * Convenience alias for stopActiveEncoding.
   */
  async stop(playSessionId: string, deviceId?: string): Promise<void> {
    return await this.stopActiveEncoding(playSessionId, deviceId);
  }
}

