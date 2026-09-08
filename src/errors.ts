export class JellyfinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JellyfinError';
  }
}

export class JellyfinApiError extends JellyfinError {
  public readonly status: number;
  public readonly endpoint?: string;

  constructor(message: string, status: number, endpoint?: string) {
    super(message);
    this.name = 'JellyfinApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

export class JellyfinAuthError extends JellyfinApiError {
  constructor(message: string = 'Unauthorized. Please check your Jellyfin credentials.', status: number = 401, endpoint?: string) {
    super(message, status, endpoint);
    this.name = 'JellyfinAuthError';
  }
}

