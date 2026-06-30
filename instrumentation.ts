export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getAuthBaseUrl, warnIfLocalhostInProduction } = await import('./lib/auth-url');
    const authUrl = getAuthBaseUrl();
    if (authUrl) {
      process.env.NEXTAUTH_URL = authUrl;
    }
    warnIfLocalhostInProduction();
  }
}
