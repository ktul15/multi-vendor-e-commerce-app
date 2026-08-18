import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const signingSecret = (name: string, developmentFallback: string): string => {
  const configured = process.env[name]?.trim();
  if (nodeEnv === 'production' && (!configured || configured.length < 32)) {
    throw new Error(
      `${name} must contain at least 32 characters in production`
    );
  }
  return configured || developmentFallback;
};

const dashboardBffSecret = (): string => {
  const configured = process.env.DASHBOARD_BFF_SECRET?.trim();
  if (nodeEnv === 'production' && (!configured || configured.length < 32)) {
    throw new Error(
      'DASHBOARD_BFF_SECRET must contain at least 32 characters in production'
    );
  }
  return configured || 'development-dashboard-bff-secret-change-me';
};

const exactOrigin = (name: string, developmentFallback: string): string => {
  const configured = process.env[name]?.trim();
  if (!configured && nodeEnv === 'production') {
    throw new Error(`${name} is required in production`);
  }

  const value = configured || developmentFallback;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute origin`);
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must contain only scheme, host, and port`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  if (nodeEnv === 'production' && url.protocol !== 'https:') {
    throw new Error(`${name} must use HTTPS in production`);
  }

  return url.origin;
};

const storefrontUrl = exactOrigin('STOREFRONT_URL', 'http://localhost:3000');
const vendorDashboardUrl = exactOrigin(
  'VENDOR_DASHBOARD_URL',
  'http://localhost:3001'
);
const adminDashboardUrl = exactOrigin(
  'ADMIN_DASHBOARD_URL',
  'http://localhost:3002'
);

const vendorDashboardRedirect = (
  name: string,
  developmentFallback: string
): string => {
  const value = process.env[name]?.trim() || developmentFallback;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.origin !== vendorDashboardUrl
  ) {
    throw new Error(`${name} must be an HTTP(S) URL on VENDOR_DASHBOARD_URL`);
  }
  if (nodeEnv === 'production' && url.protocol !== 'https:') {
    throw new Error(`${name} must use HTTPS in production`);
  }
  return url.toString();
};

const jwtAccessSecret = signingSecret(
  'JWT_ACCESS_SECRET',
  'default-access-secret'
);
const jwtRefreshSecret = signingSecret(
  'JWT_REFRESH_SECRET',
  'default-refresh-secret'
);
if (nodeEnv === 'production' && jwtAccessSecret === jwtRefreshSecret) {
  throw new Error(
    'JWT access and refresh secrets must be different in production'
  );
}

export const env = {
  // Server
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '5000', 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  DASHBOARD_BFF_SECRET: dashboardBffSecret(),

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_CONNECT_WEBHOOK_SECRET:
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '',

  // Stripe Connect
  PLATFORM_COMMISSION_RATE: process.env.PLATFORM_COMMISSION_RATE || '10.00',
  STRIPE_CONNECT_RETURN_URL: vendorDashboardRedirect(
    'STRIPE_CONNECT_RETURN_URL',
    'http://localhost:3001/stripe/return'
  ),
  STRIPE_CONNECT_REFRESH_URL: vendorDashboardRedirect(
    'STRIPE_CONNECT_REFRESH_URL',
    'http://localhost:3001/stripe/refresh'
  ),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY?.trim() || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET?.trim() || '',

  // Firebase (FCM push notifications)
  GOOGLE_APPLICATION_CREDENTIALS:
    process.env.GOOGLE_APPLICATION_CREDENTIALS || '',

  // Email
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || '',

  // CORS
  STOREFRONT_URL: storefrontUrl,
  VENDOR_DASHBOARD_URL: vendorDashboardUrl,
  ADMIN_DASHBOARD_URL: adminDashboardUrl,

  // Helpers
  isDev: nodeEnv === 'development',
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
} as const;
