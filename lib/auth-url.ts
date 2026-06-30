/**
 * Resolves the public app URL for NextAuth redirects.
 * APP_URL is checked first so production host env vars win over .env.local localhost.
 */
export function getAuthBaseUrl(): string | undefined {
  const url =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL;

  if (!url) return undefined;

  return url.replace(/\/$/, '');
}

export function warnIfLocalhostInProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const url = getAuthBaseUrl();
  if (!url) {
    console.warn(
      '[auth] APP_URL or NEXTAUTH_URL is not set in production.'
    );
    return;
  }

  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    console.error(
      `[auth] Auth URL points to localhost in production: ${url}. ` +
        'Set APP_URL on the server and remove localhost from .env.local.'
    );
  }
}
