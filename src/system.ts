import type { HttpTransport } from './http.js';
import type { PublicSystemInfo, SystemInfo } from './types.js';

/**
 * Parses a semantic version string (e.g. "10.9.11", "12.0.0", "12.0.0-rc1") into numeric components.
 */
export function parseSemVer(version: string): { major: number; minor: number; patch: number } | null {
  if (!version) return null;
  const match = version.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0
  };
}

/**
 * Checks if currentVersion is greater than or equal to targetVersion.
 */
export function isVersionAtLeast(currentVersion: string, targetVersion: string): boolean {
  const current = parseSemVer(currentVersion);
  const target = parseSemVer(targetVersion);
  if (!current || !target) return false;

  if (current.major !== target.major) {
    return current.major > target.major;
  }
  if (current.minor !== target.minor) {
    return current.minor > target.minor;
  }
  return current.patch >= target.patch;
}

/**
 * Checks if the given version string represents Jellyfin 12.0.0 or higher.
 */
export function isV12OrHigher(version?: string): boolean {
  if (!version) return false;
  const parsed = parseSemVer(version);
  if (!parsed) return false;
  return parsed.major >= 12;
}

export class SystemModule {
  private http: HttpTransport;
  private serverVersion: string | null = null;
  private targetVersion: 'auto' | '10' | '12' = 'auto';

  constructor(
    http: HttpTransport,
    options?: {
      serverVersion?: string;
      targetVersion?: 'auto' | '10' | '12';
    }
  ) {
    this.http = http;
    if (options?.serverVersion) {
      this.serverVersion = options.serverVersion;
    }
    if (options?.targetVersion) {
      this.targetVersion = options.targetVersion;
    }
  }

  /**
   * Get public system info without requiring authentication.
   */
  async getPublicInfo(): Promise<PublicSystemInfo> {
    const info = await this.http.request<PublicSystemInfo>('/System/Info/Public');
    if (info?.Version) {
      this.serverVersion = info.Version;
    }
    return info;
  }

  /**
   * Get full system info (requires authentication).
   */
  async getInfo(): Promise<SystemInfo> {
    const info = await this.http.request<SystemInfo>('/System/Info');
    if (info?.Version) {
      this.serverVersion = info.Version;
    }
    return info;
  }

  /**
   * Get the cached or explicitly configured server version string.
   */
  getVersion(): string | null {
    return this.serverVersion;
  }

  /**
   * Manually set or override the server version.
   */
  setVersion(version: string | null): void {
    this.serverVersion = version;
  }

  /**
   * Get the configured target compatibility mode.
   */
  getTargetVersion(): 'auto' | '10' | '12' {
    return this.targetVersion;
  }

  /**
   * Set target compatibility mode.
   */
  setTargetVersion(target: 'auto' | '10' | '12'): void {
    this.targetVersion = target;
  }

  /**
   * Detects and caches the server version by calling /System/Info/Public.
   */
  async detectVersion(): Promise<string | null> {
    try {
      const info = await this.getPublicInfo();
      return info?.Version || null;
    } catch {
      return null;
    }
  }

  /**
   * Checks whether the current server is Jellyfin 12 or higher.
   * If targetVersion is explicitly set to '12' or '10', that preference is honored.
   * If 'auto', resolves against known version or attempts detection.
   */
  async isV12(): Promise<boolean> {
    if (this.targetVersion === '12') return true;
    if (this.targetVersion === '10') return false;

    if (!this.serverVersion) {
      await this.detectVersion();
    }

    if (this.serverVersion) {
      return isV12OrHigher(this.serverVersion);
    }

    // Default to true (modern behavior) if undetermined
    return true;
  }

  /**
   * Synchronously checks if the server is known to be v12+ based on cached version or target setting.
   * Defaults to true (modern behavior) if unknown.
   */
  isV12Sync(): boolean {
    if (this.targetVersion === '12') return true;
    if (this.targetVersion === '10') return false;
    if (this.serverVersion) {
      return isV12OrHigher(this.serverVersion);
    }
    return true;
  }
}

