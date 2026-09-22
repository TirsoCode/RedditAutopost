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
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  sessionSecret: process.env.SESSION_SECRET || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  scanLimit: Number(process.env.SCAN_LIMIT || 50),
  cronEnabled: process.env.CRON_ENABLED !== 'false',
};

export function assertEnv() {
  const missing = [];
  if (!env.anthropicApiKey) missing.push('ANTHROPIC_API_KEY');
  if (!env.sessionSecret) missing.push('SESSION_SECRET');
  if (!env.encryptionKey) missing.push('ENCRYPTION_KEY');
  if (!env.reddit.clientId || !env.reddit.clientSecret) missing.push('REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET');
  if (missing.length) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')} (see backend/.env.example)`);
  }
  return missing.length === 0;
}