export const env = {
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    redirectUri: process.env.REDDIT_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:4000'}/api/auth/callback`,
    userAgent: process.env.REDDIT_USER_AGENT || 'RedditAutoPost/0.1',
  },
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  // Free-tier model by default; override with any model id from https://openrouter.ai/models
  openRouterModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  // Public repo of the promoted product — mentioned naturally in AI replies so people find the code
  githubUrl: process.env.GITHUB_URL || 'https://github.com/TirsoCode/cvmakerapp',
  // Dev-only defaults so the demo works out of the box. Override in .env / production!
  sessionSecret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-session-secret-change-me'),
  encryptionKey: process.env.ENCRYPTION_KEY || (process.env.NODE_ENV === 'production' ? '' : '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  scanLimit: Number(process.env.SCAN_LIMIT || 50),
  cronEnabled: process.env.CRON_ENABLED !== 'false',
};

export function assertEnv() {
  const missing = [];
  if (!env.openRouterApiKey) missing.push('OPENROUTER_API_KEY');
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
    if (!process.env.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');
  }
  if (!env.reddit.clientId || !env.reddit.clientSecret) missing.push('REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET');
  if (missing.length) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')} (see backend/.env.example)`);
  }
  return missing.length === 0;
}